# webcyte
Neural Cellular Automata experiments.

**v0.1**: [webcyte.io](https://webcyte.io)



## into

**webcyte** is for studying Neutal Cellular Automata (NCA) and other interesting models of computation and Machine Learning (ML) approaches.

Currently it is good enough to **build**, **train** and **run** a custom implementation of a model like the one described here: [Growing Neural Cellular Automata (2020)](https://distill.pub/2020/growing-ca/).  

## current
**v0.1**: Proof Of Concept (POC) - good enough for a **demo**, runs training and inference.  

## next
**v0.2**: ability to distribute computational Units across connected machines (e.g.remote training with local inference and sample collection);  

**v0.3**: autocomplete, inline error/warning reporting, UI refactoring (to the point where webcyte is not less convenient than VSCode, or Jupyter for particular tasks);  

**v0.4**: WebGL model compiler and inference environment (enable more efficient inference, allowing model deployment without external dependencies);  

**v0.5**: multi-model grid (several models interacting on same grid, possible addition of grid 'physics');  

**v0.6**: UI and ergonomics refatoring (this is likely to be an ongoing task - adapting the system to the tasks);  

**v0.7**: headless implementation for running on servers;  

**v0.8**: library of Substrates and weights (collection of interesting models);  

**v0.9**: inline help, smarter autocomplete, AI assist;  

**v1.0**: profit! 

        

## usage
Available online: [webcyte.io](https://webcyte.io)  
(TBD)


## system

### Unit (/www/Unit.js)
(TBD)

### Substrate (/www/Substrate.js)
(TBD)

### dependencies
- [CodeMirror](https://codemirror.net/) (v6): for the code editor:  
    Loads from `/www/lib/CodeMirror.js`, which is built using resources and [instructions](/buildCodeMirror/README.md) in the `/buildCodeMirror/` folder.

- [TensorFlow.js](https://www.tensorflow.org/js): for running and training models:  
    Loads from `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js`.

- [ionicons](https://github.com/ionic-team/ionicons): for some icons.  
    Embedded in HTML as SVGs (with slight modifications).
