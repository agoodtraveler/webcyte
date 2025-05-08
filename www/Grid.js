class Grid {
    seedColor = '#FFFFFFFF';
    seedSize = 2;
    minEpochLength = 64;
    maxEpochLength = 128;
    batchSize = 4;

    width = -1;
    height = -1;
    depth = -1;
    model = null;

    state = null;
    paintCtx = null;
    optimizer = null;

    seedState = null;

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

        this.paintCtx.clearRect(0, 0, this.width, this.height);
        this.paintCtx.fillStyle = '#00000000';
        this.paintCtx.fillRect(0, 0, this.width, this.height);
        this.paintCtx.fillStyle = this.seedColor;
        this.paintCtx.fillRect((width - this.seedSize) / 2, (height - this.seedSize) / 2, this.seedSize, this.seedSize);
        this.seedState = tf.tidy(() => {
            const seedTensor = tf.browser.fromPixels(this.paintCtx.canvas, 4).cast('float32').div(255.0);
            const seedAlpha = seedTensor.slice([ 0, 0, 3 ], [ -1, -1, 1 ]);
            return seedTensor.concat(seedAlpha.tile([ 1, 1, this.depth - 4 ]), 2);
        });
    }

    set learningRate(rate) {
        tf.dispose(this.optimizer);
        this.optimizer = tf.train.adam(rate);
        console.log('learning rate set', rate);
    }

    async serializeModel() {
        const fnStr = grid.model.fn.toString();
        const modelJSON = JSON.stringify({ ...this.model,
            weights: await Promise.all(this.model.weights.map(async (currLayer) => [ await currLayer[0].array(), await currLayer[1].array() ])),
            fn: fnStr.substr(fnStr.indexOf('{\n')).split('\n').slice(1).slice(0, -1).join('\n')
        });
        return modelJSON;
    }
    deserializeModel(modelJSON) {
        const model = JSON.parse(modelJSON);
        model.weights = model.weights.map(([ kernelValues, biasValues ]) => [
            tf.variable(tf.tensor(kernelValues)),
            tf.variable(tf.tensor(biasValues))
        ]);
        model.fn = new Function('state', 'weights', model.fn);
        this.model.weights.forEach(([ kernel, bias ]) => {
            tf.dispose(kernel);
            tf.dispose(bias);
        });
        this.model = model;
        console.log(model);
    }

    async render(ctx) {
        const rgbaTensor = tf.tidy(() => this.state.slice([ 0, 0, 0, 0 ], [ 1, -1, -1, 4 ]).mul(255).cast('int32'));
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
    cycle(srcState = this.state) {
        const prevState = this.state;
        this.state = tf.tidy(() => {
            const alpha = srcState.slice([ 0, 0, 0, 3 ], [ -1, -1, -1, 1 ]);
            const liveMask = tf.avgPool(alpha, [ 3, 3 ], [ 1, 1 ], 'same').sub(this.model.liveThreshold).mul(10).sigmoid();
            const activeMask = tf.randomUniform([ this.height, this.width ]).less(this.model.cellFiringRate).cast('float32').expandDims(2);
            this.state = tf.concat([
                srcState.slice([ 0, 0, 0, 0 ], [ -1, -1, -1, 3 ]),
                alpha.sub(this.model.decayRate).clipByValue(0, 1),
                srcState.slice([ 0, 0, 0, 4 ], [ -1, -1, -1, this.depth - 4 ])
            ], 3);
            return this.state.add(this.model.fn(this.state.mul(liveMask), this.model.weights).mul(activeMask));
        });
        tf.dispose(prevState);
    }

    #targetTensor = null;
    #targetBatch = null;
    get targetTensor() {
        return this.#targetTensor;
    }
    set targetTensor(targetTensor) {
        this.#targetTensor = targetTensor;
        this.#startStates.forEach(currState => tf.dispose(currState));
        this.#startStates = new Array(this.batchSize).fill(0).map(() => this.seedState.clone());
        //const rndMask = (prob) => tf.randomUniform([ this.height, this.width ]).less(prob).cast('float32').expandDims(2);
        //for (let i = this.#startStates.length; i < this.batchSize; ++i) {
            //const maskProb = 0.05 + Math.random() * 0.1;
            //this.#startStates.push(tf.tidy(() => tf.concat([ this.#targetTensor.mul(rndMask(maskProb)), tf.zeros([this.height, this.width, this.depth - 4 ])], 2)));
        //}
        tf.dispose(this.#targetBatch);
        this.#targetBatch = this.#targetTensor.expandDims(0).tile([ this.batchSize, 1, 1, 1 ]);
    }
    #startStates = [];
    getRndStartStateIndex() {
        return Math.round(1 + Math.random() * (this.batchSize - 2));
    }
    addStartState(state) {
        let rndIndex = this.getRndStartStateIndex();
        tf.dispose(this.#startStates[rndIndex]);
        this.#startStates[rndIndex] = state;
    }
    epoch() {
        const length = this.minEpochLength + Math.round((Math.random() * (this.maxEpochLength - this.minEpochLength)));
        tf.dispose(this.state);
        this.state = tf.stack(this.#startStates);
        
        this.optimizer.minimize(() => tf.tidy(() => {
            for (let i = 0; i < length; ++i) {
                this.cycle();
            }
            tf.keep(this.state);
            return tf.losses.meanSquaredError(this.#targetBatch, this.state.slice([ 0, 0, 0, 0 ], [ -1, -1, -1, 4 ]));
        }), false);

        //for (let i = 0; i < 2; ++i) {
            for (let j = 0; j < length / 3; ++j) {
                this.cycle();
            }
            this.addStartState(this.state.slice([ this.getRndStartStateIndex(), 0, 0, 0 ], [ 1, -1, -1, -1 ]).squeeze(0));
        //}
        console.log(`epochLength = ${ length };`);
    }
}
