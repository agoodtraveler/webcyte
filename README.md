# webcyte
a project for exploring Neural Cellular Automata and other interesting computational models.

The main drive (currently) is getting to an interesting, multi-model Substrate implementation.  
The online environment ([webcyte.io](https://webcyte.io)) is developed to support the initial goal.  

Currently it is good enough to **build**, **train** and **run** a custom implementation of a model like the one described here: [Growing Neural Cellular Automata (2020)](https://distill.pub/2020/growing-ca/).  

[webcyte.io](https://webcyte.io)

## current
**v0.1**: Proof Of Concept (POC) - good enough for a **demo**, runs training and inference.  

## next
**v0.2**: remote training (running inference and training on two separate devices sharing substrate parameters and weights);  

**v0.3**: implementation of [Self-Organizing Textures](https://distill.pub/selforg/2021/textures/);  

**v0.4**: headless implementation for running on servers (extend remote training);  

**v0.5**: multi-model grid (multiple models interacting on same grid);  

**v0.6**: attempt at 3d ('voxel based') grids;  

**v0.7**: WebGL model compiler and inference environment (enable more efficient inference, allowing model deployment without external dependencies);

**v0.8**: camera and microphone input;

**v0.9**: Collection of representative substrates (models) and unit/utility library;  

**v1.0**: profit!  


## usage
Available online: [webcyte.io](https://webcyte.io)  
(TBD)


## system

### Utilities (/www/utils/)
Contains utilities and helpers that may be used in units and elsewhere throughout the system.

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
