const fnToCode = (fn) => {
    const fnStr = fn.toString();
    const startIndex = fnStr.indexOf('{');
    const endIndex = fnStr.lastIndexOf('}');
    if (startIndex < 0 || endIndex < 0) throw new Error('assert');
    return fnStr.substring(startIndex + 1, endIndex).trim();
}



const DEFAULT_PARAMS_CODE = fnToCode((params, weights, shared) => {
params.dense_layer_size = 128;
params.weight_init_min = -0.1;
params.weight_init_max = 0.1;
params.epoch_length_min = 64;
params.epoch_length_max = 96;
params.cell_firing_rate = 0.5;
params.live_threshold = 0.1;
params.grid_width = 48;
params.grid_height = params.grid_width;
params.grid_depth = 16;
params.sample = '🙂'; // '💾'; // '🌈'; // '🙂'; // '🤖'; // '🦎'; // '🌼';
params.sample_height = 0.5 * params.grid_height;
params.seed_color = '#FFFFFFFF';
params.seed_size = 2;
params.brushColor = params.seed_color;
params.brush_size = params.seed_size;
});



const DEFAULT_WEIGHTS_CODE = fnToCode((params, weights, shared) => {
weights.sobel_x = tf.tidy(() => tf.tensor([ [ -1, 0, 1], [ -2, 0, 2 ], [ -1, 0, 1 ] ]).expandDims(2).tile([ 1, 1, params.grid_depth ]).expandDims(3));
weights.sobel_y = tf.tidy(() => tf.tensor([ [ -1, -2, -1], [ 0, 0, 0 ], [ 1, 2, 1 ] ]).expandDims(2).tile([ 1, 1, params.grid_depth ]).expandDims(3));
weights.dense = tf.tidy(() => tf.variable(tf.randomUniform([ 1, 1, params.grid_depth * 3, params.dense_layer_size ], params.weight_init_min, params.weight_init_max, 'float32')))
weights.output = tf.tidy(() => tf.variable(tf.randomUniform([ 1, 1, params.dense_layer_size,  params.grid_depth ], params.weight_init_min, params.weight_init_max, 'float32')))
});



const DEFAULT_CYCLE_CODE = fnToCode((params, weights, shared) => {
const compute = () => {
    const xGrad = state.depthwiseConv2d(weights.sobel_x, 1, 'same');
    const yGrad = state.depthwiseConv2d(weights.sobel_y, 1, 'same');
    state = tf.concat([ xGrad, yGrad, state ], 3);
    state = state.conv2d(weights.dense, 1, 'same').relu();
    return state.conv2d(weights.output, 1, 'same').tanh();
}
const thresholdOp = tf.customGrad((tensor, save) => {
    save([ tensor ]);
    return {
        value: tensor.greater(this.model.liveThreshold).cast('float32'),
        gradFunc: (dy, [ tensor ]) => {
            const sigmoid = tensor.sub(this.model.liveThreshold).mul(20).sigmoid();
            const sigmoidGrad = sigmoid.mul(sigmoid.neg().add(1));
            return [ dy.mul(sigmoidGrad) ];
        }
    };
});

shared.cycle = () => {
    const nextState = tf.tidy(() => {
    const activeMask = tf.randomUniform([ 1, this.height, this.width ]).less(this.model.cellFiringRate).cast('float32').expandDims(3);
    const alpha = this.state.slice([ 0, 0, 0, 3 ], [ -1, -1, -1, 1 ]);
    const liveMask = thresholdOp(tf.pool(alpha, [ 3, 3 ], 'max', 'same', [ 1, 1 ]));
    const liveState = this.state.mul(liveMask);
    return liveState.add(compute(liveState, this.model.weights).mul(activeMask));
});
tf.dispose(this.state);
this.state = nextState;
}
});



const DEFAULT_LEARN_CODE = fnToCode((params, weights, shared) => {
const epoch = (seedState, targetState, epochLength) => {
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
const ATTRACTOR_SWITCH_PERIOD = 64;
const ATTRACTOR_BATCH_MAX_COUNT = 2;
const ATTRACTOR_MAX_OVERRUN = EPOCH_LENGTH_MAX * 16;
const ATTRACTOR_COST_THRESHOLD = 0.02
let attractorSeedBatch = null;
let attractorTargetBatch = null;
let epochCount = 0;
const sampleRun = (cost) => {
    let overrunLength = 0;
    if (epochCount != 0 && cost < ATTRACTOR_COST_THRESHOLD / 5 && epochCount % ATTRACTOR_SWITCH_PERIOD === 0) {
        tf.tidy(() => {
            while(cost < ATTRACTOR_COST_THRESHOLD && overrunLength < ATTRACTOR_MAX_OVERRUN) {
                grid.cycle();
                cost = tf.losses.meanSquaredError(targetState, grid.state.slice([ 0, 0, 0, 0 ], [ -1, -1, -1, 4 ])).dataSync()[0];
                ++overrunLength;
            }
            if (cost >= ATTRACTOR_COST_THRESHOLD) {
                const [ sampleCount ] = attractorSeedBatch?.shape || [ 0 ];
                if (sampleCount >= ATTRACTOR_BATCH_MAX_COUNT) {
                    const prev = attractorSeedBatch;
                    attractorSeedBatch = attractorSeedBatch.slice([ 1, 0, 0, 0 ], [ sampleCount - 1, -1, -1, -1 ]);
                    tf.dispose(prev);
                } else {
                    if (attractorTargetBatch === null) {
                        attractorTargetBatch = targetState.clone();
                    } else {
                        const prev = attractorTargetBatch;
                        attractorTargetBatch = attractorTargetBatch.concat(targetState, 0);
                        tf.dispose(prev);
                    }
                }
                if (attractorSeedBatch === null) {
                    attractorSeedBatch = grid.state.clone();
                } else {
                    const prev = attractorSeedBatch;
                    attractorSeedBatch = attractorSeedBatch.concat(grid.state, 0);
                    tf.dispose(prev);
                }
                tf.keep(attractorSeedBatch);
                tf.keep(attractorTargetBatch);
                console.log('added sample');
            }
            console.log('post epoch', overrunLength);
        });
    }
}
shared.learn = () => {
    for (let i = 0; i < 8; ++i) {
        const epochLength = EPOCH_LENGTH_MIN + Math.round((Math.random() * (EPOCH_LENGTH_MAX - EPOCH_LENGTH_MIN)));
        const currCost = grid.epoch(seedState, targetState, epochLength);
        console.log(`epoch ${ epochCount }: length = ${ epochLength };  cost = ${ currCost }`);
        sampleRun(currCost);
        if (attractorSeedBatch != null && epochCount % 2 === 0) {
            const currCost = grid.epoch(attractorSeedBatch, attractorTargetBatch, Math.round(epochLength));
            console.log(`attractor epoch ${ epochCount }: length = ${ epochLength };  cost = ${ currCost }`);
        }
        ++epochCount;
    }
}
});




const DEFAULT_INIT_CODE = fnToCode((params, weights, shared) => {
shared.gridCanvas = document.createElement('canvas');
shared.gridCanvas.width = params.grid_width;
shared.gridCanvas.height = params.grid_height;
const gridCtx = shared.gridCanvas.getContext('2d');

shared.targetCanvas = document.createElement('canvas');
shared.targetCanvas.width = params.grid_width;
shared.targetCanvas.height = params.grid_height;
const targetCtx = shared.targetCanvas.getContext('2d');
targetCtx.font = `${ params.sample_height }px monospace`;
const sampleMeasurements = targetCtx.measureText(params.sample);
targetCtx.clearRect(0, 0, shared.targetCanvas.width, shared.targetCanvas.height);
targetCtx.fillStyle = '#000000FF';
targetCtx.translate((params.grid_width) / 2, (params.grid_height) / 2);
targetCtx.fillText(params.sample, -0.5 * sampleMeasurements.width, 0.5 * (params.sample_height - sampleMeasurements.fontBoundingBoxDescent));

const paintCtx = document.createElement('canvas').getContext('2d');
paintCtx.canvas.width = params.grid_width;
paintCtx.canvas.height = params.grid_height;
const genSeedState = () => {
    paintCtx.clearRect(0, 0, paintCtx.canvas.width, paintCtx.canvas.height);
    paintCtx.fillStyle = params.seed_color;
    paintCtx.fillRect((paintCtx.canvas.width - params.seed_size) / 2, (paintCtx.canvas.height - params.seed_size) / 2, params.seed_size, params.seed_size);
    return tf.tidy(() => {
        const seedImgTensor = tf.browser.fromPixels(paintCtx.canvas, 4).cast('float32').div(255.0);
        const seedAlpha = seedImgTensor.slice([ 0, 0, 3 ], [ -1, -1, 1 ]);
        return seedImgTensor.concat(seedAlpha.tile([ 1, 1, params.grid_depth - 4 ]), 2).expandDims(0);
    });
}

const grid = new Grid(GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, model);
const seedState = genSeedState();
const targetState = tf.tidy(() => tf.browser.fromPixels(targetCanvas, 4).cast('float32').div(255.0).expandDims(0));

let renderOption = 0;

const render = () => {
    if (renderOption === 0) {
        grid.render(gridCtx);
    } else {
        grid.renderLayer(gridCtx, renderOption - 1);
    }
}
});
