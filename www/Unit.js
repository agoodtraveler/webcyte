const makeDiv = (className) => {
    const div = document.createElement('div');
    div.className = className;
    return div;
}
const makeBtn = (title, onClick = () => console.log('onClick', title)) => {
    const btn = document.createElement('button');
    btn.onclick = onClick;
    btn.innerText = title;
    return btn;
}


class Unit {
    div = null;
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
        this.nameDiv = controlsDiv.appendChild(makeDiv('title'));
        this.nameDiv.setAttribute('spellcheck', false);
        this.nameDiv.setAttribute('contenteditable', true);
        this.nameDiv.innerText = name;
        this.nameDiv.onkeydown = (event) => {
            if (event.keyCode === 13) {
                event.preventDefault();
            }
        }
        const runBtn = controlsDiv.appendChild(makeBtn('▶', () => runFn(this)));
        const delBtn = controlsDiv.appendChild(makeBtn('❌', () => delFn(this)));
        delBtn.style.marginTop = '2em';
        const contentsDiv = this.div.appendChild(makeDiv('contents'));
        const editorDiv = contentsDiv.appendChild(makeDiv('editor'));
        const languagePack = cm.javascript();
        this.editor = new cm.EditorView({
            extensions: [
                cm.basicSetup,
                cmTheme,
                cm.EditorView.lineWrapping,
                languagePack,
                languagePack.language.data.of({ autocomplete: onAutoComplete })
            ],
            parent: editorDiv,
            doc: code
        });
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
}
