const cmTheme = [];

(() => {
/* based on https://github.com/dennis84/codemirror-themes */
    const config = {
        dark: true,
        background: '#282A36',
        foreground: '#F8F8F2',
        selection: '#44475A',
        cursor: '#F8F8F2',
        dropdownBackground: '#282A36',
        dropdownBorder: '#191A21',
        activeLine: '#53576c22',
        lineNumber: '#6272A4',
        lineNumberActive: '#F8F8F2',
        matchingBracket: '#44475A',
        keyword: '#FF79C6',
        storage: '#FF79C6',
        variable: '#F8F8F2',
        parameter: '#F8F8F2',
        function: '#23d750' /*'#50FA7B'*/,
        propertyName: '#23d750',
        string: '#F1FA8C',
        constant: '#BD93F9',
        type: '#8BE9FD',
        class: '#8BE9FD',
        number: '#BD93F9',
        comment: '#6272A4',
        heading: '#BD93F9',
        invalid: '#FF5555',
        regexp: '#F1FA8C',
    };

    const theme = cm.EditorView.theme({
        '&': {
            color: config.foreground,
            backgroundColor: config.background,
        },
        '.cm-content': { caretColor: config.cursor },
        '.cm-cursor, .cm-dropCursor': { borderLeftColor: config.cursor },
        '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
            backgroundColor: config.selection
        },
        '.cm-panels': {
            backgroundColor: config.dropdownBackground,
            color: config.foreground
        },
        '.cm-panels.cm-panels-top': { borderBottom: '2px solid black' },
        '.cm-panels.cm-panels-bottom': { borderTop: '2px solid black' },
        '.cm-searchMatch': {
            backgroundColor: config.dropdownBackground,
            outline: `1px solid ${ config.dropdownBorder }`
        },
        '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: config.selection },
        '.cm-activeLine': { backgroundColor: config.activeLine },
        '.cm-selectionMatch': { backgroundColor: config.selection },
        '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
            backgroundColor: config.matchingBracket,
            outline: 'none'
        },
        '.cm-gutters': {
            backgroundColor: config.background,
            color: config.foreground,
            border: 'none'
        },
        '.cm-activeLineGutter': { backgroundColor: config.background },
        '.cm-lineNumbers .cm-gutterElement': { color: config.lineNumber },
        '.cm-lineNumbers .cm-activeLineGutter': { color: config.lineNumberActive },
        '.cm-foldPlaceholder': {
            backgroundColor: 'transparent',
            border: 'none',
            color: config.foreground
        },
        '.cm-tooltip': {
            border: `1px solid ${config.dropdownBorder}`,
            backgroundColor: config.dropdownBackground,
            color: config.foreground,
        },
        '.cm-tooltip .cm-tooltip-arrow:before': {
            borderTopColor: 'transparent',
            borderBottomColor: 'transparent'
        },
        '.cm-tooltip .cm-tooltip-arrow:after': {
            borderTopColor: config.foreground,
            borderBottomColor: config.foreground,
        },
        '.cm-tooltip-autocomplete': {
            '& > ul > li[aria-selected]': {
                background: config.selection,
                color: config.foreground,
            }
        }
    }, { dark: config.dark });

    const highlightStyle = cm.HighlightStyle.define([
        { tag: cm.tags.keyword, color: config.keyword },
        { tag:  [ cm.tags.name, cm.tags.deleted, cm.tags.character, cm.tags.macroName ], color: config.variable },
        { tag:  [ cm.tags.propertyName ], color: config.propertyName },
        { tag:  [ cm.tags.processingInstruction, cm.tags.string, cm.tags.inserted, cm.tags.special(cm.tags.string) ], color: config.string },
        { tag:  [ cm.tags.function(cm.tags.variableName), cm.tags.labelName ], color: config.function },
        { tag:  [ cm.tags.color, cm.tags.constant(cm.tags.name), cm.tags.standard(cm.tags.name) ], color: config.constant },
        { tag:  [ cm.tags.definition(cm.tags.name), cm.tags.separator ], color: config.variable },
        { tag:  [ cm.tags.className ], color: config.class },
        { tag:  [ cm.tags.number, cm.tags.changed, cm.tags.annotation, cm.tags.modifier, cm.tags.self, cm.tags.namespace ], color: config.number },
        { tag:  [ cm.tags.typeName ], color: config.type, fontStyle: config.type},
        { tag:  [ cm.tags.operator, cm.tags.operatorKeyword ], color: config.keyword },
        { tag:  [ cm.tags.url, cm.tags.escape, cm.tags.regexp, cm.tags.link ], color: config.regexp },
        { tag:  [ cm.tags.meta, cm.tags.comment ], color: config.comment },
        { tag: cm.tags.strong, fontWeight: 'bold' },
        { tag: cm.tags.emphasis, fontStyle: 'italic' },
        { tag: cm.tags.link, textDecoration: 'underline' },
        { tag: cm.tags.heading, fontWeight: 'bold', color: config.heading },
        { tag:  [ cm.tags.atom, cm.tags.bool, cm.tags.special(cm.tags.variableName) ], color: config.variable },
        { tag: cm.tags.invalid, color: config.invalid },
        { tag: cm.tags.strikethrough, textDecoration: 'line-through' },
     ]);

    cmTheme.length = 0;
    cmTheme.push(theme, cm.syntaxHighlighting(highlightStyle));  
})();