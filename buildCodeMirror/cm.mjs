export {    EditorView, keymap, highlightSpecialChars,
            drawSelection, highlightActiveLine, dropCursor,
            lineNumbers, highlightActiveLineGutter
        } from '@codemirror/view'
export {    EditorState, Prec
        } from '@codemirror/state'
export {    syntaxTree, HighlightStyle, syntaxHighlighting, indentUnit,
            indentOnInput, bracketMatching,
            foldGutter, foldKeymap
        } from '@codemirror/language'
export {    defaultKeymap, history, historyKeymap
        } from '@codemirror/commands'
export {    searchKeymap, highlightSelectionMatches
        } from "@codemirror/search"
export {    linter, lintKeymap
        } from '@codemirror/lint'
export { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap 
        } from '@codemirror/autocomplete'
export { javascript
        } from '@codemirror/lang-javascript'
export { tags
        } from '@lezer/highlight';