class Grid {
    width = -1;
    height = -1;
    depth = -1;
    model = null;

    state = null;
    paintCtx = null;
    optimizer = null;

    constructor(width, height, depth, model) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.model = model;

        this.state = tf.zeros([ 1, width, height, depth ]);

        this.paintCtx = document.createElement('canvas').getContext('2d');
        this.paintCtx.canvas.width = width;
        this.paintCtx.canvas.height = height;

        this.optimizer = tf.train.adam();
    }

    set learningRate(rate) {
        tf.dispose(this.optimizer);
        this.optimizer = tf.train.adam(rate);
        console.log('learning rate set', rate);
    }

    async render(ctx) {
        const rgbaTensor = tf.tidy(() => this.state.slice([ 0, 0, 0, 0 ], [ 1, -1, -1, 4 ]).mul(255).cast('int32'));
        const rgbaArray = new Uint8ClampedArray(await rgbaTensor.data());
        tf.dispose(rgbaTensor);
        ctx.putImageData(new ImageData(rgbaArray, this.width, this.height), 0, 0);
    }
    async renderLayer(ctx, layerNumber) {
        const rgbaTensor = tf.tidy(() => this.state.slice([ 0, 0, 0, layerNumber ], [ 1, -1, -1, 1 ]).tile([ 1, 1, 1, 3 ]).concat(tf.ones([ 1, this.height, this.width, 1 ]), 3)).mul(255).cast('int32');
        const rgbaArray = new Uint8ClampedArray(await rgbaTensor.data());
        tf.dispose(rgbaTensor);
        ctx.putImageData(new ImageData(rgbaArray, this.width, this.height), 0, 0);
    }
    clear() {
        tf.dispose(this.state);
        this.state = tf.zeros([ 1, this.height, this.width, this.depth ]);
    }
    paint(x, y, size, color) {
        this.paintCtx.clearRect(0, 0, this.width, this.height);
        this.paintCtx.fillStyle = color;
        this.paintCtx.fillRect(x - (size / 2), y - (size / 2), size, size);
        const nextState = tf.tidy(() => {
            const seedTensor = tf.browser.fromPixels(this.paintCtx.canvas, 4).cast('float32').div(255.0);
            const seedAlpha = seedTensor.slice([ 0, 0, 3 ], [ this.height, this.width, 1 ]);
            const notSeedMask = seedAlpha.less(0.5).cast('float32');
            const seedState = seedTensor.concat(seedAlpha.tile([ 1, 1, this.depth - 4 ]), 2).expandDims(0);
            return this.state.mul(notSeedMask).add(seedState);
        });
        tf.dispose(this.state);
        this.state = nextState;
    }
}
