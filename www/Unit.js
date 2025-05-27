class Unit {
    static VALID_NAME_REGEX = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
    static MIN_NAME_LENGTH = 1;
    static MAX_NAME_LENGTH = 256;
    static isValidName = (name) => name.length <= Unit.MAX_NAME_LENGTH && name.length >= Unit.MIN_NAME_LENGTH && Unit.VALID_NAME_REGEX.test(name);
    
    name = null;
    self = null;
    prefixDiv = null;
    suffixDiv = null;
    div = null;
    editor = null;
    constructor(name, code, runFn, delFn, renameFn) {
        this.name = name;
        this.self = {};
        this.div = makeDiv('Unit');
        const panelDiv = this.div.appendChild(makeDiv('panel'));
        const controlsDiv = panelDiv.appendChild(makeDiv('controls'));
        const runBtn = controlsDiv.appendChild(makeButton('▶', () => runFn(this)));
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
            if (renameFn(this, nameDiv.innerText)) {
                this.name = nameDiv.innerText;
            } else {
                nameDiv.innerText = this.name;
            }
            nameDiv.classList.remove('invalid');
        }
        const delBtn = controlsDiv.appendChild(makeButton('❌', () => delFn(this)));
        delBtn.style.marginTop = '2em';
        const contentsDiv = this.div.appendChild(makeDiv('contents'));
        this.prefixDiv = contentsDiv.appendChild(makeDiv('ui'));
        const editorDiv = contentsDiv.appendChild(makeDiv('editor'));
        const languagePack = cm.javascript();
        const webcyteKeymap = cm.keymap.of([{
                    key: "Ctrl-Enter",
                    preventDefault: true,
                    run: (view) => { runFn(this); return true; }
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
                cmTheme,
                cm.EditorView.lineWrapping,
                languagePack,
                languagePack.language.data.of({ autocomplete: completionContext => this.onAutoComplete(completionContext) }),
                cm.indentUnit.of("    "),
            ],
            parent: editorDiv,
            doc: code
        });
        this.suffixDiv = contentsDiv.appendChild(makeDiv('ui'));
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

    onAutoComplete(completionContext) {
        const match = completionContext.matchBefore(/[\w.]*/);
        if (match.from == match.to && !completionContext.explicit) {
            return null;
        }
        const names = match.text.split('.');
        const prefix = names.filter((currWord, i) => currWord.trim().length > 0 || i === names.length - 1);
        let obj = globalThis;
        if (prefix.length > 1) {
            for (let i = 0; i < prefix.length; ++i) {
                const currPropName = prefix[i];
                if (Object.hasOwn(obj, currPropName)) {
                    obj = obj[currPropName];
                }
            }
        }
        const options = [];
        for (let currObj = obj; currObj !== null; currObj = Object.getPrototypeOf(currObj)) {
            options.push(...Object.getOwnPropertyNames(currObj).map(currName => {
                const currOption = { label: currName };
                const currProp = currObj[currName];
                if (typeof currProp === 'function') {
                    currOption.type = 'function';
                } else {
                    currOption.type = 'property';
                }
                return currOption;
            }));
        }
        return {
            from: completionContext.matchBefore(/\w*/).from,
            validFor: /^\w*$/,
            options
        };
    }

    clearUI() {
        this.prefixDiv.innerHTML = '';
        this.suffixDiv.innerHTML = '';
    }
}
