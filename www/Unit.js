class Unit {
    static VALID_NAME_REGEX = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
    static PARAM_NAMES = [ 'self', 'vars', 'prefixDiv', 'suffixDiv', 'cleanup' ];
    static MIN_NAME_LENGTH = 1;
    static MAX_NAME_LENGTH = 256;
    static DEFAULT_NAME_PREFIX = 'unit_';
    static DEFAULT_CODE = '// Hello World!';
    static isValidName = (name) => name.length <= Unit.MAX_NAME_LENGTH && name.length >= Unit.MIN_NAME_LENGTH && Unit.VALID_NAME_REGEX.test(name) && !Unit.PARAM_NAMES.includes(name);
    
    name = null;
    self = null;
    substrate = null;
    prefixDiv = null;
    suffixDiv = null;
    div = null;
    editor = null;
    constructor(name, code, substrate) {
        this.name = name;
        this.self = {};
        this.substrate = substrate;
        this.div = makeDiv('Unit');
        const panelDiv = this.div.appendChild(makeDiv('panel'));
        const controlsDiv = panelDiv.appendChild(makeDiv('controls'));
        const runBtn = controlsDiv.appendChild(makeButton('<svg class="ionicon" viewBox="0 0 512 512"><use href="#playImg"></use></svg>', `Run unit: '${ this.name }'`, () => this.run()));
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
        const editorDiv = contentsDiv.appendChild(makeDiv('editor'));
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

    #cleanupFns = [];
    cleanup() {
        for (let i = this.#cleanupFns.length - 1; i >= 0; --i) {
            this.#cleanupFns[i]();
        }
        this.#cleanupFns.length = 0;
        this.prefixDiv.innerHTML = '';
        this.suffixDiv.innerHTML = '';
    }
    run() {
        try {
            const fn = new Function('self', 'vars', 'prefixDiv', 'suffixDiv', 'cleanup', ...this.substrate.units.map(x => x.name), this.code);
            this.cleanup();
            fn(this.self, this.substrate.vars, this.prefixDiv, this.suffixDiv, (fn) => this.#cleanupFns.push(fn), ...this.substrate.units.map(x => x.self));
        } catch (error) {
            console.log(`unit: ${ this.name }`, error);
            // const message = error.message;
            // const stackLines = error.stack?.split('\n');
            // console.log(message, stackLines[0]);
        }
    }

    onAutoComplete(completionContext) {
        const match = completionContext.matchBefore(/[\w.]*/);
        if (match.from == match.to && !completionContext.explicit) {
            return null;
        }
        const names = match.text.split('.');
        const prefix = names.filter((currWord, i) => currWord.trim().length > 0 || i === names.length - 1);
        const options = [];
        let currThis = globalThis;
        for (let i = 0; i < prefix.length; ++i) {
            if (Object.hasOwn(currThis, prefix[i])) {
                const currProp = currThis[prefix[i]];
                currThis = currProp;
                continue;
            } else if (i === 0 && prefix.length > 1) {
                if (prefix[0] === 'self') {
                    currThis = this.self;
                    continue;
                } else if (prefix[0] === 'vars') {
                    currThis = this.substrate.vars;
                    continue;
                } else if (prefix[0] === 'prefixDiv') {
                    currThis = this.prefixDiv;
                    continue;
                } else if (prefix[0] === 'suffixDiv') {
                    currThis = this.suffixDiv;
                    continue;
                } else if (prefix[0] === 'cleanup') {
                    currThis = () => true;
                    continue;
                } else if (this.substrate.units.filter(x => x.name === prefix[0]).length > 0) {
                    currThis = this.substrate.units.find(x => x.name === prefix[0]);
                    continue;
                }
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
