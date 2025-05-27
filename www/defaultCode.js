const fnToCode = (fn) => {
    const fnStr = fn.toString();
    const startIndex = fnStr.indexOf('{');
    const endIndex = fnStr.lastIndexOf('}');
    if (startIndex < 0 || endIndex < 0) throw new Error('assert');
    return fnStr.substring(startIndex + 1, endIndex).trim();
}



const DEFAULT_INTRO_CODE = fnToCode((self, weights, prefixDiv, suffixDiv) => {
    prefixDiv.innerHTML = `<h1>Parameters</h1>`;
});
const DEFAULT_PARAMS_CODE = fnToCode((self, weights, prefixDiv, suffixDiv) => {
suffixDiv.innerHTML = ``;
self.grid_width = 48;
self.grid_height = self.grid_width;
self.grid_depth = 16;
self.dense_layer_size = 128;
self.weight_init_min = -0.1;
self.weight_init_max = 0.1;
self.cell_firing_rate = 0.5;
self.live_threshold = 0.1;
self.sample = '🙂'; // '💾'; // '🌈'; // '🙂'; // '🤖'; // '🦎'; // '🌼';
self.sample_height = 0.5 * self.grid_height;
self.seed_color = '#FFFFFFFF';
self.seed_size = 2;
self.attractor_batch_max_count = 2;   // 4 nearly maxes out 8GB

self.epoch_length_min = 64;
self.epoch_length_max = 96;
self.attractor_switch_period = 64;
self.attractor_max_overrun = self.epoch_length_max * 16;
self.attractor_cost_threshold = 0.02

self.brush_color = self.seed_color;
self.brush_size = self.seed_size;
suffixDiv.innerHTML = `done.`;
});



const DEFAULT_WEIGHTS_CODE = fnToCode((self, weights, prefixDiv, suffixDiv) => {

const denseLayerShape = [ 1, 1, params.grid_depth * 3, params.dense_layer_size ];   // see compute() below, for why '3'
const outputLayerShape = [ 1, 1, params.dense_layer_size,  params.grid_depth ];

weights.sobel_x = tf.tidy(() => tf.tensor([ [ -1, 0, 1], [ -2, 0, 2 ], [ -1, 0, 1 ] ])
    .expandDims(2)
    .tile([ 1, 1, params.grid_depth ])
    .expandDims(3));
weights.sobel_y = tf.tidy(() => tf.tensor([ [ -1, -2, -1], [ 0, 0, 0 ], [ 1, 2, 1 ] ])
    .expandDims(2)
    .tile([ 1, 1, params.grid_depth ])
    .expandDims(3));
weights.dense = tf.tidy(() => tf.variable(tf.randomUniform(denseLayerShape, params.weight_init_min, params.weight_init_max, 'float32')));
weights.output = tf.tidy(() => tf.variable(tf.randomUniform(outputLayerShape, params.weight_init_min, params.weight_init_max, 'float32')));

self.compute = (gridState) => {
    const xGrad = gridState.depthwiseConv2d(weights.sobel_x, 1, 'same');
    const yGrad = gridState.depthwiseConv2d(weights.sobel_y, 1, 'same');
    gridState = tf.concat([ xGrad, yGrad, gridState ], 3);
    gridState = gridState.conv2d(weights.dense, 1, 'same').relu();
    return gridState.conv2d(weights.output, 1, 'same').tanh();
}

}).trim();



const DEFAULT_TARGET_CODE = fnToCode((self, weights, prefixDiv, suffixDiv) => {
    
self.targetCanvas = makeCanvas(params.grid_width, params.grid_height);
const targetCtx = self.targetCanvas.getContext('2d');
targetCtx.font = `${ params.sample_height }px monospace`;
const sampleMeasurements = targetCtx.measureText(params.sample);
targetCtx.clearRect(0, 0, self.targetCanvas.width, self.targetCanvas.height);
targetCtx.fillStyle = '#000000FF';
targetCtx.translate((params.grid_width) / 2, (params.grid_height) / 2);
targetCtx.fillText(params.sample, -0.5 * sampleMeasurements.width, 0.5 * (params.sample_height - sampleMeasurements.fontBoundingBoxDescent));

self.targetCanvas.onmousedown = (event) => {
    const x = Math.floor((event.offsetX * params.grid_width) / self.targetCanvas.offsetWidth);
    const y = Math.floor((event.offsetY * params.grid_height) / self.targetCanvas.offsetHeight);
    const pixel = targetCtx.getImageData(x, y, 1, 1).data;
    self.brush_color = `rgba(${ pixel[0] }, ${ pixel[1] }, ${ pixel[2] }, ${ pixel[3] })`;
}
suffixDiv.appendChild(self.targetCanvas);

}).trim();



const DEFAULT_CYCLE_CODE = fnToCode((self, weights, prefixDiv, suffixDiv) => {

const thresholdOp = tf.customGrad((tensor, save) => {
    save([ tensor ]);
    return {
        value: tensor.greater(params.live_threshold).cast('float32'),
        gradFunc: (dy, [ tensor ]) => {
            const sigmoid = tensor.sub(this.model.liveThreshold).mul(20).sigmoid();
            const sigmoidGrad = sigmoid.mul(sigmoid.neg().add(1));
            return [ dy.mul(sigmoidGrad) ];
        }
    };
});

self.cycle = (gridState) =>  tf.tidy(() => {
    const activeMask = tf.randomUniform([ 1, params.grid_height, params.grid_width ]).less(params.cell_firing_rate).cast('float32').expandDims(3);
    const alpha = gridState.slice([ 0, 0, 0, 3 ], [ -1, -1, -1, 1 ]);
    const liveMask = thresholdOp(tf.pool(alpha, [ 3, 3 ], 'max', 'same', [ 1, 1 ]));
    const liveState = gridState.mul(liveMask);
    return liveState.add(self.compute(liveState).mul(activeMask));
});

}).trim();


const DEFAULT_LEARN_CODE = fnToCode((self, weights, prefixDiv, suffixDiv) => {

let optimizer = tf.train.adam();
self.setLearningRate = (rate) => {
    tf.dispose(optimizer);
    optimizer = tf.train.adam(rate);
    console.log('learning rate set', rate);
}


let attractorSeedBatch = null;
let attractorTargetBatch = null;
let epochCount = 0;
const sampleRun = (cost) => {
    let overrunLength = 0;
    if (epochCount != 0 && cost < params.attractor_cost_threshold / 5 && epochCount % params.attractor_switch_period === 0) {
        tf.tidy(() => {
            while(cost < params.attractor_cost_threshold && overrunLength < params.attractor_max_overrun) {
                grid.cycle();
                cost = tf.losses.meanSquaredError(targetState, grid.state.slice([ 0, 0, 0, 0 ], [ -1, -1, -1, 4 ])).dataSync()[0];
                ++overrunLength;
            }
            if (cost >= params.attractor_cost_threshold) {
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
const epoch = (seedState, targetState, epochLength) => {
    let state = seedState;
    const costTensor = optimizer.minimize(() => tf.tidy(() => {
        for (let i = 0; i < epochLength; ++i) {
            state = self.cycle(state);
        }
        tf.keep(state);
        return tf.losses.meanSquaredError(targetState, state.slice([ 0, 0, 0, 0 ], [ -1, -1, -1, 4 ]));
    }), true);
    const cost = costTensor.dataSync()[0];
    tf.dispose(costTensor);
    return { state, cost };
}

self.learn = () => {
    for (let i = 0; i < 8; ++i) {
        const epochLength = params.epoch_length_min + Math.round((Math.random() * (params.epoch_length_max - params.epoch_length_min)));
        const { state, cost } = epoch(seedState, targetState, epochLength);
        console.log(`epoch ${ epochCount }: length = ${ epochLength };  cost = ${ cost }`);
        sampleRun(cost);
        if (attractorSeedBatch != null && epochCount % 2 === 0) {
            const {state, cost } = epoch(attractorSeedBatch, attractorTargetBatch, epochLength);
            console.log(`attractor epoch ${ epochCount }: length = ${ epochLength };  cost = ${ cost }`);
        }
        ++epochCount;
    }
}

}).trim();



const DEFAULT_GRID_CODE = fnToCode((self, weights, prefixDiv, suffixDiv) => {

const paintCtx = makeCanvas(params.grid_width, params.grid_height).getContext('2d');
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

let gridState = tf.zeros([ 1, params.grid_height, params.grid_width, params.grid_depth ]);
const seedState = genSeedState();
const targetState = tf.tidy(() => tf.browser.fromPixels(self.targetCanvas, 4)
    .cast('float32')
    .div(255.0)
    .expandDims(0));

const render = async (ctx) => {
    const rgbaTensor = tf.tidy(() => this.state.slice([ 0, 0, 0, 0 ], [ 1, -1, -1, 4 ])
        .mul(255)
        .cast('int32'));
    const rgbaArray = new Uint8ClampedArray(await rgbaTensor.data());
    tf.dispose(rgbaTensor);
    ctx.putImageData(new ImageData(rgbaArray, this.width, this.height), 0, 0);
}
const renderLayer = async (ctx, layerNumber) => {
    const rgbaTensor = tf.tidy(() => gridState.slice([ 0, 0, 0, layerNumber ], [ 1, -1, -1, 1 ])
        .tile([ 1, 1, 1, 3 ])
        .concat(tf.ones([ 1, params.grid_height, params.grid_width, 1 ]), 3))
        .mul(255)
        .cast('int32');
    const rgbaArray = new Uint8ClampedArray(await rgbaTensor.data());
    tf.dispose(rgbaTensor);
    ctx.putImageData(new ImageData(rgbaArray, params.grid_width, params.grid_height), 0, 0);
}
const clear = () => {
    tf.dispose(gridState);
    gridState = tf.zeros([ 1, params.grid_height, params.grid_width, params.grid_depth ]);
}
const paint = (x, y, size, color) => {
    paintCtx.clearRect(0, 0, this.width, this.height);
    paintCtx.fillStyle = color;
    paintCtx.fillRect(x - (size / 2), y - (size / 2), size, size);
    const nextState = tf.tidy(() => {
        const seedTensor = tf.browser.fromPixels(this.paintCtx.canvas, 4)
            .cast('float32')
            .div(255.0);
        const seedAlpha = seedTensor.slice([ 0, 0, 3 ], [ this.height, this.width, 1 ]);
        const notSeedMask = seedAlpha.less(0.5).cast('float32');
        const seedState = seedTensor.concat(seedAlpha.tile([ 1, 1, this.depth - 4 ]), 2)
            .expandDims(0);
        return this.state.mul(notSeedMask).add(seedState);
    });
    tf.dispose(gridState);
    gridState = nextState;
}

const gridCanvas = makeCanvas(params.grid_width, params.grid_height);
const gridCtx = gridCanvas.getContext('2d');
gridCanvas.onmousedown = gridCanvas.onmousemove = (event) => {
    if (event.buttons & 1 === 1) {
        const x = Math.floor((event.offsetX * params.grid_width) / gridCanvas.offsetWidth);
        const y = Math.floor((event.offsetY * params.grid_height) / gridCanvas.offsetHeight);
        grid.paint(x, y, self.brush_size, self.brush_color);
    }
    render();
}


}).trim();
