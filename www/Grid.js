class Grid {
    static CELL_FIRING_RATE = 0.5;
    static LIVE_THRESHOLD = 0.4;
    static DECAY_RATE = 0.01;
    static MIN_EPOCH_LENGTH = 64;
    static MAX_EPOCH_LENGTH = 256;

    width = -1;
    height = -1;
    depth = -1;
    modelWeights = null;
    modelFn = null;

    state = null;
    paintCtx = null;
    optimizer = null;

    constructor(width, height, depth, weights, fn) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.modelWeights = weights;
        this.modelFn = fn;

        this.state = tf.zeros([ width, height, depth ]);

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

    serializeModel = () => {
        const modelJSON = JSON.stringify({
            weights: this.modelWeights.map(currLayer => [ currLayer[0].arraySync(), currLayer[1].arraySync() ]),
            fn: this.modelFn.toString().split('\n').slice(1).slice(0, -1).join('\n')
        });
        return modelJSON;
    }
    deserializeModel = (modelJSON) => {
        const { weights, fn } = JSON.parse(modelJSON);
        this.modelWeights.forEach(([ kernel, bias ]) => {
            tf.dispose(kernel);
            tf.dispose(bias);
        });
        this.modelWeights = weights.map(([ kernelValues, biasValues ]) => [
            tf.variable(tf.tensor(kernelValues)),
            tf.variable(tf.tensor(biasValues))
        ]);
        this.modelFn = new Function('state', 'weights', fn);
        console.log(this.modelFn.toString());
    }

    render = async (ctx) => {
        const rgbaTensor = tf.tidy(() => this.state.slice([ 0, 0, 0 ], [ this.height, this.width, 4 ]).mul(255).cast('int32'));
        const rgbaArray = new Uint8ClampedArray(await rgbaTensor.data());
        tf.dispose(rgbaTensor);
        ctx.putImageData(new ImageData(rgbaArray, this.width, this.height), 0, 0);
    }
    clear() {
        tf.dispose(this.state);
        this.state = tf.zeros([ this.height, this.width, this.depth ]);
    }
    paint(x, y, size, color) {
        this.paintCtx.clearRect(0, 0, this.width, this.height);
        this.paintCtx.fillStyle = '#00000000';
        this.paintCtx.fillRect(0, 0, this.width, this.height);
        this.paintCtx.fillStyle = color;
        this.paintCtx.fillRect(x, y, size, size);
        const prevState = this.state;
        this.state = tf.tidy(() => {
            const seedTensor = tf.browser.fromPixels(this.paintCtx.canvas, 4).cast('float32').div(255.0);
            const seedAlpha = seedTensor.slice([ 0, 0, 3 ], [ this.height, this.width, 1 ]);
            const notSeedMask = seedAlpha.less(0.5 /* should be 0.0, or 1.0 everywhere */).cast('float32');
            const seedState = seedTensor.concat(seedAlpha.tile([ 1, 1, this.depth - 4 ]), 2);
            return this.state.mul(notSeedMask).add(seedState);
        });
        tf.dispose(prevState);
    }
    cycle() {
        const prevState = this.state;
        this.state = tf.tidy(() => {
            const alpha = this.state.slice([ 0, 0, 3 ], [ this.height, this.width, 1 ]);
            const liveMask = tf.avgPool(alpha, [ 3, 3 ], [ 1, 1 ], 'same').sub(Grid.LIVE_THRESHOLD).mul(10).sigmoid();
            const rndMask = tf.randomUniform([ this.height, this.width ]).less(Grid.CELL_FIRING_RATE).cast('float32').expandDims(2);
            this.state = tf.concat([
                this.state.slice([ 0, 0, 0 ], [ this.height, this.width, 3 ]),
                alpha.sub(Grid.DECAY_RATE).clipByValue(0, 1),
                this.state.slice([ 0, 0, 4 ], [ this.height, this.width, this.depth - 4 ])
            ], 2);
            return this.state.add(this.modelFn(this.state.mul(liveMask), this.modelWeights).mul(rndMask));
        });
        tf.dispose(prevState);
    }
    epoch(targetTensor) {
        const length = Grid.MIN_EPOCH_LENGTH + Math.round((Math.random() * (Grid.MAX_EPOCH_LENGTH - Grid.MIN_EPOCH_LENGTH)));
        this.optimizer.minimize(() => tf.tidy(() => {
            for (let i = 0; i < length; ++i) {
                this.cycle();
            }
            tf.keep(this.state);
            return tf.losses.meanSquaredError(targetTensor, this.state.slice([ 0, 0, 0 ], [ this.height, this.width, 4 ]));
        }), false);
        console.log(`epochLength = ${ length };`);
    }
}