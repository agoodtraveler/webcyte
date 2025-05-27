class Unit {
    div = null;
    prefixDiv = null;
    suffixDiv = null;
    nameDiv = null;
    editor = null;
    console = null;
    constructor(name, code, runFn, delFn) {
        this.console = {};
        this.console.log = console.log;

        const onAutoComplete = (completionContext) => {
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

        this.div = makeDiv('Unit');
        const panelDiv = this.div.appendChild(makeDiv('panel'));
        const controlsDiv = panelDiv.appendChild(makeDiv('controls'));
        const runBtn = controlsDiv.appendChild(makeButton('▶', () => runFn(this)));
        this.nameDiv = controlsDiv.appendChild(makeDiv('title'));
        this.nameDiv.setAttribute('spellcheck', false);
        this.nameDiv.setAttribute('contenteditable', 'plaintext-only');
        this.nameDiv.innerText = name;
        this.nameDiv.onkeydown = (event) => {
            if (event.keyCode === 13) {
                event.preventDefault();
            }
        }
        let hasNameChanged = false;
        this.nameDiv.oninput = () => {
            hasNameChanged = true;
        }
        this.nameDiv.onblur = () => {
            if (hasNameChanged) {
                this.nameDiv.innerText = this.nameDiv.innerText.replaceAll(/[\n\r]/gi, '').trim();
                hasNameChanged = false;
            }
        }
        const delBtn = controlsDiv.appendChild(makeButton('❌', () => delFn(this)));
        delBtn.style.marginTop = '2em';
        const contentsDiv = this.div.appendChild(makeDiv('contents'));
        this.prefixDiv = contentsDiv.appendChild(makeDiv('ui'));
        const editorDiv = contentsDiv.appendChild(makeDiv('editor'));
        const languagePack = cm.javascript();
        const keymap = cm.keymap.of([{
                    key: "Ctrl-Enter",
                    preventDefault: true,
                    run: (view) => runFn(this)
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
                keymap,
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
                languagePack.language.data.of({ autocomplete: onAutoComplete }),
                cm.indentUnit.of("    "),
                keymap
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

    clearUI() {
        this.prefixDiv.innerHTML = '';
        this.postfixDiv.innerHTML = '';
    }
}
