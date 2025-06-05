class State {
    static BATCH_SIZE = 1;
    width = -1;
    height = -1;
    depth = -1;
    #tensor = null;
    constructor(width, height, depth, tensor = tf.zeros([ State.BATCH_SIZE, height, width, depth ])) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.#tensor = tensor;
    }
    set tensor(newTensor) {
        if (this.#tensor && this.#tensor != newTensor) {
            tf.dispose(this.#tensor);
        }
        this.#tensor = newTensor;
    }
    get tensor() {
        return this.#tensor;
    }
    dispose() {
        tf.dispose(this.#tensor);
    }
    clear() {
        this.dispose();
        this.#tensor = tf.zeros([ State.BATCH_SIZE, this.height, this.width, this.depth ]);
    }
    async render(toCtx, layerNumber = 0) {  // 0 = render 4 first layers as RGBA. 1 to this.depth = individual layers.
        let rgbaTensor = null;
        if (layerNumber === 0) {
            rgbaTensor = tf.tidy(() => this.#tensor.slice([ 0, 0, 0, 0 ], [ 1, -1, -1, 4 ])
                .mul(255)
                .cast('int32'));
        } else {
            rgbaTensor = tf.tidy(() => this.#tensor.slice([ 0, 0, 0, layerNumber - 1 ], [ 1, -1, -1, 1 ])
                .tile([ 1, 1, 1, 3 ])
                .concat(tf.ones([ 1, this.height, this.width, 1 ]), 3)
                .mul(255)
                .cast('int32'));
        }
        const rgbaArray = new Uint8ClampedArray(await rgbaTensor.data());
        tf.dispose(rgbaTensor);
        toCtx.putImageData(new ImageData(rgbaArray, this.width, this.height), 0, 0);
    }
    paint(fromCanvas) {
        this.tensor = (tf.tidy(() => {
            const rgbaTensor = tf.browser.fromPixels(fromCanvas, 4)
                .cast('float32')
                .div(255.0);
            const alphaTensor = rgbaTensor.slice([ 0, 0, 3 ], [ fromCanvas.height, fromCanvas.width, 1 ]);
            const maskTensor = alphaTensor.less(0.5).cast('float32');
            const paintState = rgbaTensor.concat(alphaTensor.tile([ 1, 1, this.depth - 4 ]), 2).expandDims(0);
            return this.#tensor.mul(maskTensor).add(paintState);
        }));
        
    }
}