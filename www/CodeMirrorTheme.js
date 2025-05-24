const cmTheme = [];

(() => {
    const chalky = "#e5c07b",
        coral = "#e06c75",
        cyan = "#56b6c2",
        invalid = "#ffffff",
        ivory = "#abb2bf",
        stone = "#7d8799",
        malibu = "#61afef",
        sage = "#98c379",
        whiskey = "#d19a66",
        violet = "#c678dd",
        darkBackground = "#21252b",
        highlightBackground = "#2c313a",
        background = "#282c34",
        tooltipBackground = "#353a42",
        selection = "#3E4451",
        cursor = "#528bff";

    const oneDarkTheme = cm.EditorView.theme({
        "&": {
            color: ivory,
            backgroundColor: background
        },
        ".cm-content": {
            caretColor: cursor
        },
        ".cm-cursor, .cm-dropCursor": { borderLeftColor: cursor },
        "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { backgroundColor: selection },
        ".cm-panels": { backgroundColor: darkBackground, color: ivory },
        ".cm-panels.cm-panels-top": { borderBottom: "2px solid black" },
        ".cm-panels.cm-panels-bottom": { borderTop: "2px solid black" },
        ".cm-searchMatch": {
            backgroundColor: "#72a1ff59",
            outline: "1px solid #457dff"
        },
        ".cm-searchMatch.cm-searchMatch-selected": {
            backgroundColor: "#6199ff2f"
        },
        ".cm-activeLine": { backgroundColor: "#6699ff0b" },
        ".cm-selectionMatch": { backgroundColor: "#aafe661a" },
        "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
            backgroundColor: "#bad0f847"
        },
        ".cm-gutters": {
            backgroundColor: background,
            color: stone,
            border: "none"
        },
        ".cm-activeLineGutter": {
            backgroundColor: highlightBackground
        },
        ".cm-foldPlaceholder": {
            backgroundColor: "transparent",
            border: "none",
            color: "#ddd"
        },
        ".cm-tooltip": {
            border: "none",
            backgroundColor: tooltipBackground
        },
        ".cm-tooltip .cm-tooltip-arrow:before": {
            borderTopColor: "transparent",
            borderBottomColor: "transparent"
        },
        ".cm-tooltip .cm-tooltip-arrow:after": {
            borderTopColor: tooltipBackground,
            borderBottomColor: tooltipBackground
        },
        ".cm-tooltip-autocomplete": {
            "& > ul > li[aria-selected]": {
                backgroundColor: highlightBackground,
                color: ivory
            }
        }
    }, { dark: true });

    const oneDarkHighlightStyle = cm.HighlightStyle.define([
        { tag: cm.tags.keyword,
            color: violet },
        { tag: [cm.tags.name, cm.tags.deleted, cm.tags.character, cm.tags.propertyName, cm.tags.macroName],
            color: coral },
        { tag: [cm.tags.function(cm.tags.variableName), cm.tags.labelName],
            color: malibu },
        { tag: [cm.tags.color, cm.tags.constant(cm.tags.name), cm.tags.standard(cm.tags.name)],
            color: whiskey },
        { tag: [cm.tags.definition(cm.tags.name), cm.tags.separator],
            color: ivory },
        { tag: [cm.tags.typeName, cm.tags.className, cm.tags.number, cm.tags.changed, cm.tags.annotation, cm.tags.modifier, cm.tags.self, cm.tags.namespace],
            color: chalky },
        { tag: [cm.tags.operator, cm.tags.operatorKeyword, cm.tags.url, cm.tags.escape, cm.tags.regexp, cm.tags.link, cm.tags.special(cm.tags.string)],
            color: cyan },
        { tag: [cm.tags.meta, cm.tags.comment],
            color: stone },
        { tag: cm.tags.strong,
            fontWeight: "bold" },
        { tag: cm.tags.emphasis,
            fontStyle: "italic" },
        { tag: cm.tags.strikethrough,
            textDecoration: "line-through" },
        { tag: cm.tags.link,
            color: stone,
            textDecoration: "underline" },
        { tag: cm.tags.heading,
            fontWeight: "bold",
            color: coral },
        { tag: [cm.tags.atom, cm.tags.bool, cm.tags.special(cm.tags.variableName)],
            color: whiskey },
        { tag: [cm.tags.processingInstruction, cm.tags.string, cm.tags.inserted],
            color: sage },
        { tag: cm.tags.invalid,
            color: invalid },
    ]);



    cmTheme.length = 0;
    cmTheme.push(oneDarkTheme, cm.syntaxHighlighting(oneDarkHighlightStyle));
})();