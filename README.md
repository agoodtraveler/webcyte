# webcyte
Neural Cellular Automata Playground


# intro
(TBD)

# usage
(TBD)

# running locally
1. `git clone ...`
2. open `www/index.html` in a modern browser



# system

### Unit (/www/Unit.js)
(TBD)

### Substrate (/www/Substrate.js)
(TBD)

## dependencies
- [CodeMirror](https://codemirror.net/) (v6): for the code editor:
    
    Loads from `/www/lib/CodeMirror.js`, which is built using resources and [instructions](/buildCodeMirror/README.md) in the `/buildCodeMirror/` folder.

- [TensorFlow.js](https://www.tensorflow.org/js): for running and training models:

    Loads from `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js`, but can also be bundled locally enabling the system to work completely 'offline'.

- [ionicons](https://github.com/ionic-team/ionicons): for some icons.

    Embedded in HTML as SVGs (with slight modifications).
