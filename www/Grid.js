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

    async serializeModel() {
        const fnStr = grid.model.fn.toString();
        const modelJSON = JSON.stringify({ ...this.model,
            weights: await Promise.all(this.model.weights.map(async (currLayer) => await currLayer.array())),
            fn: fnStr.substr(fnStr.indexOf('{\n')).split('\n').slice(1).slice(0, -1).join('\n')
        });
        return modelJSON;
    }
    deserializeModel(modelJSON) {
        const model = JSON.parse(modelJSON);
        model.weights = model.weights.map(kernelValue => tf.variable(tf.tensor(kernelValue)));
        model.fn = new Function('state', 'weights', model.fn);
        this.model.weights.forEach(kernel => tf.dispose(kernel));
        this.model = model;
        console.log('model deserialized', model);
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
    cycle() {
        const thresholdOp = tf.customGrad((tensor, save) => {
            save([ tensor ]);
            return {
                value: tensor.greater(this.model.liveThreshold).cast('float32'),
                gradFunc: (dy, [ tensor ]) => {
                    const sigmoid = tensor.sub(this.model.liveThreshold).mul(20).sigmoid();
                    const sigmoidGrad = sigmoid.mul(sigmoid.neg().add(1)); // TODO: figure out why tf.grad(tensor => tensor.sub(this.model.liveThreshold).mul(10).sigmoid())(tensor) doesn't work (exception in training)
                    return [ dy.mul(sigmoidGrad) ];
                }
            };
        });
        const nextState = tf.tidy(() => {
            const activeMask = tf.randomUniform([ 1, this.height, this.width ]).less(this.model.cellFiringRate).cast('float32').expandDims(3);
            const alpha = this.state.slice([ 0, 0, 0, 3 ], [ -1, -1, -1, 1 ]);
            const liveMask = thresholdOp(tf.pool(alpha, [ 3, 3 ], 'max', 'same', [ 1, 1 ])); // tf.avgPool(alpha, [ 3, 3 ], [ 1, 1 ], 'same').sub(this.model.liveThreshold).mul(10).sigmoid();
            const liveState = this.state.mul(liveMask);
            return liveState.add(this.model.fn(liveState, this.model.weights).mul(activeMask));
        });
        tf.dispose(this.state);
        this.state = nextState;
    }

    epoch(seedState, targetState, epochLength) {
        const costTensor = this.optimizer.minimize(() => tf.tidy(() => {
            tf.dispose(this.state);
            this.state = seedState.clone();
            for (let i = 0; i < epochLength; ++i) {
                this.cycle();
            }
            tf.keep(this.state);
            return tf.losses.meanSquaredError(targetState, this.state.slice([ 0, 0, 0, 0 ], [ -1, -1, -1, 4 ]));
        }), true);
        const cost = costTensor.dataSync()[0];
        tf.dispose(costTensor);
        return cost;
    }
}
