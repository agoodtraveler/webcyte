# webcyte
A project for exploring Neural Cellular Automata and other interesting computational models.

Currently it is good enough to **build**, **train** and **run** a custom implementation of a model like the one described here: [Growing Neural Cellular Automata (2020)](https://distill.pub/2020/growing-ca/).  

[webcyte.io](https://webcyte.io)
 

## dependencies
- [CodeMirror](https://codemirror.net/) (v6): for the code editor:  
    Loads from `/www/lib/CodeMirror.js`, which is built using resources and [instructions](/buildCodeMirror/README.md) in the `/buildCodeMirror/` folder.

- [TensorFlow.js](https://www.tensorflow.org/js): for running and training models:  
    Loads from `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js`.

- [ionicons](https://github.com/ionic-team/ionicons): for some icons.  
    Embedded in HTML as SVGs (with slight modifications).
