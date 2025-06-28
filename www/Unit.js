class Unit {
    static VALID_NAME_REGEX = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
    static PARAM_NAMES = [ 'self', 'weights', 'prefixDiv', 'suffixDiv', 'defer', 'log' ];
    static MIN_NAME_LENGTH = 1;
    static MAX_NAME_LENGTH = 256;
    static DEFAULT_NAME_PREFIX = 'unit_';
    static DEFAULT_CODE = '// Hello World!';
    static isValidName = (name) => name.length <= Unit.MAX_NAME_LENGTH && name.length >= Unit.MIN_NAME_LENGTH && Unit.VALID_NAME_REGEX.test(name) && !Unit.PARAM_NAMES.includes(name);
    
    div = null;
    self = null;
    weights = null;
    substrate = null;
    prefixDiv = null;
    suffixDiv = null;
    editorDetails = null;
    editor = null;
    #name = null;
    set name(x) {
        this.#name = x;
        this.div.id = `unit_${ x }`;
    }
    get name() {
        return this.#name;
    }
    constructor(name, code, isOpen, substrate) {
        this.div = makeDiv('Unit');
        this.name = name;
        this.self = {};
        this.weights = {};
        this.substrate = substrate;
        const handleDiv = this.div.appendChild(makeDiv('handle'));
        const controlsDiv = handleDiv.appendChild(makeDiv('controls'));
        const runBtn = controlsDiv.appendChild(makeButton('<svg class="ionicon" viewBox="0 0 512 512"><use href="#playImg"></use></svg>', `Run unit: '${ this.name }' ('Ctrl + Enter' hotkey in code editor)`, () => this.run()));
        const nameDiv = controlsDiv.appendChild(makeDiv('title'));
        nameDiv.setAttribute('spellcheck', false);
        nameDiv.setAttribute('contenteditable', 'plaintext-only');
        nameDiv.innerText = this.name;
        nameDiv.onkeydown = (event) => {
            if (event.keyCode === 13) {
                event.preventDefault();
            }
        }
        nameDiv.oninput = () => {
            if (Unit.isValidName(nameDiv.innerText)) {
                nameDiv.classList.remove('invalid');
            } else {
                nameDiv.classList.add('invalid');
            }
        }
        nameDiv.onblur = () => {
            const newName = nameDiv.innerText.trim();
            if (Unit.isValidName(newName) && this.substrate.units.filter(x => (x != this && x.name === newName)).length === 0) {
                this.name = nameDiv.innerText;
            } else {
                nameDiv.innerText = this.name;
            }
            nameDiv.classList.remove('invalid');
        }
        const delBtn = controlsDiv.appendChild(makeButton('<svg class="ionicon" viewBox="0 0 512 512"><use href="#trashImg"></use></svg>', `Delete unit: '${ this.name }'`, () => this.substrate.removeUnit(this)));
        delBtn.style.marginTop = '1em';
        delBtn.style.marginBottom = '1em';
        const contentsDiv = this.div.appendChild(makeDiv('contents'));
        this.prefixDiv = contentsDiv.appendChild(makeDiv('prefixDiv'));
        this.editorDetails = contentsDiv.appendChild(makeDetails(''));
        if (isOpen) {
            this.editorDetails.setAttribute('open', true);
        }
        const editorDiv = this.editorDetails.appendChild(makeDiv('editor'));
        const languagePack = cm.javascript();
        const webcyteKeymap = cm.keymap.of([{
                    key: "Ctrl-Enter",
                    preventDefault: true,
                    run: (view) => { this.run(); return true; }
                },
                {
                    key: "Tab",
                    preventDefault: true,
                    run: ({ state, dispatch }) => {
                        dispatch(state.update(state.replaceSelection('    '), { scrollIntoView: true, userEvent: "input"}))
                        return true
                    }
                }
            ]);
        this.editor = new cm.EditorView({
            extensions: [
                webcyteKeymap,
                cm.lineNumbers(),
                cm.highlightActiveLineGutter(),
                cm.highlightSpecialChars(),
                cm.history(),
                cm.foldGutter(),
                cm.drawSelection(),
                cm.dropCursor(),
                cm.EditorState.allowMultipleSelections.of(true),
                cm.indentOnInput(),
                cm.bracketMatching(),
                cm.closeBrackets(),
                cm.autocompletion(),
                cm.highlightActiveLine(),
                cm.highlightSelectionMatches(),
                cm.keymap.of([
                    ...cm.closeBracketsKeymap,
                    ...cm.defaultKeymap,
                    ...cm.searchKeymap,
                    ...cm.historyKeymap,
                    ...cm.foldKeymap,
                    ...cm.completionKeymap,
                    ...cm.lintKeymap
                ]),
                editorTheme,
                cm.EditorView.lineWrapping,
                languagePack,
                languagePack.language.data.of({ autocomplete: completionContext => this.onAutoComplete(completionContext) }),
                cm.indentUnit.of("    "),
            ],
            parent: editorDiv,
            doc: code
        });
        this.suffixDiv = contentsDiv.appendChild(makeDiv('suffixDiv'));
    }
    get code() {
        return this.editor.state.doc.toString();
    }
    set code(code) {
        this.editor.dispatch({changes: {
                from: 0,
                to: this.editor.state.doc.length,
                insert: code
            }});
    }

    async save() {
        const weights = {};
        for (const currName in this.weights) {
            const currWeights = this.weights[currName];
            weights[currName] = {
                isVariable: currWeights instanceof tf.Variable,
                value: await currWeights.array()
            };
        }
        const isOpen = this.editorDetails.open;
        return { name: this.name, code: this.code, weights, isOpen };
    }
    loadWeights(weightsSrc) {
        this.#releaseWeights();
        for (const currName in weightsSrc) {
            const tensor = tf.tensor(weightsSrc[currName].value);
            this.weights[currName] = weightsSrc[currName].isVariable ? tf.variable(tensor) : tensor;
        }
    }

    #releaseWeights() {
        for (let currName in this.weights) {
            tf.dispose(this.weights[currName]);
        }
        this.weights = {};
    }
    #deferredFns = [];
    cleanup(keepWeights = false) {
        for (let i = this.#deferredFns.length - 1; i >= 0; --i) {
            this.#deferredFns[i]();
        }
        this.#deferredFns.length = 0;
        if (!keepWeights) {
            this.#releaseWeights();
        }
        this.prefixDiv.innerHTML = '';
        this.suffixDiv.innerHTML = '';
    }
    run() {
        const defer = (fn) => this.#deferredFns.push(fn);
        const log = (text) => this.substrate.log(this, text);
        let isComplete = false;
        let fn = null;
        try {
            fn = new Function('self', 'weights', 'prefixDiv', 'suffixDiv', 'defer', 'log', ...this.substrate.units.map(x => x.name), this.code);
        } catch (error) {
            this.substrate.log(this, error.stack, 'error');
            return isComplete;
        }
        try {
            this.cleanup(true);
            fn(this.self, this.weights, this.prefixDiv, this.suffixDiv, defer, log, ...this.substrate.units.map(x => x.self));
            isComplete = true;
        } catch (error) {
            this.substrate.log(this, error.stack, 'error');
        }
        return isComplete;
    }
    onAutoComplete(completionContext) {
        const match = completionContext.matchBefore(/[\w.]*/);
        // console.log('onAutoComplete\n\tmatch', match);
        
        if (match.from == match.to && !completionContext.explicit) {
            return null;
        }
        const names = match.text.split('.');
        const prefix = names.filter((currWord, i) => currWord.trim().length > 0 || i === names.length - 1);
        // console.log(`\tprefix: ${ prefix.toString() }`);
        const options = [];
        let currThis = globalThis;
        for (let i = 0; i < prefix.length; ++i) {
            if (i === 0 && prefix.length > 1) {
                if (prefix[0] === 'self') {
                    currThis = this.self;
                    continue;
                } else if (prefix[0] === 'weights') {
                    currThis = this.weights;
                    continue;
                } else if (prefix[0] === 'prefixDiv') {
                    currThis = this.prefixDiv;
                    continue;
                } else if (prefix[0] === 'suffixDiv') {
                    currThis = this.suffixDiv;
                    continue;
                } else if (prefix[0] === 'defer') {
                    currThis = () => true;
                    continue;
                } else if (prefix[0] === 'log') {
                    currThis = () => true;
                } else if (this.substrate.units.filter(x => x.name === prefix[0]).length > 0) {
                    const currUnit = this.substrate.units.find(x => x.name === prefix[0]);
                    if (currUnit) {
                        currThis = currUnit.self;
                    }
                    continue;
                }
            } else if (Object.hasOwn(currThis, prefix[i])) {
                const currProp = currThis[prefix[i]];
                currThis = currProp;
                continue;
            }
            break;
        }
        if (prefix.length === 1) {
            options.push(...Unit.PARAM_NAMES.map(x => ({ label: x, type: 'variable' })));
            options.push(...this.substrate.units.map(x => ({ label: x.name, type: 'variable' })));
        }
        options.push(...Object.getOwnPropertyNames(currThis).map(currName => {
            const currOption = { label: currName };
            const currProp = currThis[currName];
            if (typeof currProp === 'function') {
                currOption.type = 'function';
            } else {
                currOption.type = 'property';
            }
            return currOption;
        }));

        return {
            from: completionContext.matchBefore(/\w*/).from,
            validFor: /^\w*$/,
            options
        };
    }
}
