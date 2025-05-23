# CodeMirror build

Simple setup to build [CodeMirror](https://codemirror.net), as a 'namespaced' JavaScript component (usable via `<script>` tag.)

## Instructions:
1. run `npm install`;
2. modify cm.mjs, if required;
3. run `node ./node_modules/rollup/dist/bin/rollup cm.mjs -f iife -n cm -o CodeMirror.js -p @rollup/plugin-node-resolve`

This should produce `CodeMirror.js`, which can then be used in other projects.

## Testing:
Open `test.html` to run a minimal test setup of CodeMirror.

## Notes:
More information information: https://codemirror.net/examples/bundle/