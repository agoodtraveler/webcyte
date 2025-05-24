const DEV_MODE = true;

const fnToCode = (fn) => {
    const fnStr = fn.toString();
    const startIndex = fnStr.indexOf('{');
    const endIndex = fnStr.lastIndexOf('}');
    if (startIndex < 0 || endIndex < 0) throw new Error('assert');
    return fnStr.substring(startIndex + 1, endIndex).trim();
}

const DEFAULT_INIT = fnToCode((console, params, weights, ui) => {
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

weights.sobel_x = tf.tidy(() => tf.tensor([ [ -1, 0, 1], [ -2, 0, 2 ], [ -1, 0, 1 ] ]).expandDims(2).tile([ 1, 1, params.grid_depth ]).expandDims(3));
weights.sobel_y = tf.tidy(() => tf.tensor([ [ -1, -2, -1], [ 0, 0, 0 ], [ 1, 2, 1 ] ]).expandDims(2).tile([ 1, 1, params.grid_depth ]).expandDims(3));
weights.dense = tf.tidy(() => tf.variable(tf.randomUniform([ 1, 1, params.grid_depth * 3, params.dense_layer_size ], params.weight_init_min, params.weight_init_max, 'float32')))
weights.output = tf.tidy(() => tf.variable(tf.randomUniform([ 1, 1, params.dense_layer_size,  params.grid_depth ], params.weight_init_min, params.weight_init_max, 'float32')))

ui.gridCanvas = document.createElement('canvas');
ui.gridCanvas.width = params.grid_width;
ui.gridCanvas.height = params.grid_height;
const gridCtx = gridCanvas.getContext('2d');

ui.targetCanvas = document.createElement('canvas');
ui.targetCanvas.width = params.grid_width;
ui.targetCanvas.height = params.grid_height;
const targetCtx = targetCanvas.getContext('2d');
targetCtx.font = `${ params.sample_height }px monospace`;
const sampleMeasurements = targetCtx.measureText(params.sample);
targetCtx.clearRect(0, 0, ui.targetCanvas.width, ui.targetCanvas.height);
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
});

const DEFAULT_COMPUTE = fnToCode((console, params, weights, ui) => {
const xGrad = state.depthwiseConv2d(weights.sobel_x, 1, 'same');
const yGrad = state.depthwiseConv2d(weights.sobel_y, 1, 'same');
state = tf.concat([ xGrad, yGrad, state ], 3);
state = state.conv2d(weights.dense, 1, 'same').relu();
return state.conv2d(weights.output, 1, 'same').tanh();
});



const globals = { params: {}, weights: {} };
const units = [];

const runUnit = (unit) => {
    try {
        const fn = new Function('console', 'params', 'weights', 'ui', unit.code);
        const ui = {};
        fn(unit.console, globals.params, globals.weights, ui);
        for (const currName in ui) {
            console.log('ui', ui[currName]);
        }
    } catch (error) {
        const message = error.message;
        const stackLines = error.stack?.split('\n');
        console.log(message, stackLines[0]);
    }
}
const delUnit = (unit) => {
    unit.div.parentElement.removeChild(unit.div);
    units.splice(units.indexOf(unit), 1);
    units.forEach((currUnit, i) => currUnit.div.style.order = i);
}
const addUnit = (name, code, atIndex = units.length) => {
    const unit = new Unit(name, code, runUnit, delUnit);
    units.splice(atIndex, 0, unit);
    units.forEach((currUnit, i) => currUnit.div.style.order = i);
    contentsDiv.appendChild(unit.div);
    return unit;
}
const clearUnits = () => {
    units.length = 0;
    document.querySelectorAll('.Unit').forEach(unitEl => unitEl.parentElement.removeChild(unitEl));
}


const serialize = async () => {
    const dst = {
        globals: {
            params: {},
            weights: {}
        },
        units: units.map((currUnit) => ({ name: currUnit.nameDiv.innerText, code: currUnit.code })),
    };
    for (const currName in globals.params) {
        dst.globals.params[currName] = globals.params[currName];
    }
    for (const currName in globals.weights) {
        dst.globals.weights[currName] = {
            isVariable: globals.weights[currName] instanceof tf.Variable,
            value: await globals.weights[currName].array()
        };
    }
    return JSON.stringify(dst);
}
const deserialize = (jsonStr) => {
    const src = JSON.parse(jsonStr);
    
    for (const currName in globals.weights) {
        tf.dispose(globals.weights[currName]);
        delete globals.weights[currName];
    }
    for (const currName in src.globals.weights) {
        const currWeights = src.globals.weights[currName];
        const tensor = tf.tensor(currWeights.value);
        globals.weights[currName] = currWeights.isVariable ? tf.variable(tensor) : tensor;
    }

    globals.params = {};
    for (const currName in src.globals.params) {
        globals.params[currName] = src.globals.params[currName];
    }

    clearUnits();
    src.units.forEach(currUnit => addUnit(currUnit.name, currUnit.code));
}



const contentsDiv = document.getElementById('contents');
contentsDiv.onscroll = () => {
    const contentsRect = contentsDiv.getBoundingClientRect();
    contentsDiv.querySelectorAll('.Unit').forEach(currUnitDiv => {
        const unitRect = currUnitDiv.getBoundingClientRect();
        if (unitRect.y < contentsRect.height && unitRect.y + unitRect.height > 0) {
            const controlsDiv = currUnitDiv.querySelector('.controls');
            const controlsRect = controlsDiv.getBoundingClientRect();
            if (unitRect.y >= contentsRect.y) {
                controlsDiv.style.transform = 'translateY(0px)';
            } else {
                controlsDiv.style.transform = `translateY(${ Math.min(contentsRect.y - unitRect.y, unitRect.height - controlsRect.height) }px)`;
            }
        }
    });
}

window.onload = () => {
    addUnit('init', DEFAULT_INIT);
    addUnit('compute', DEFAULT_COMPUTE);
}



const saveToFile = async () => {
    const url = URL.createObjectURL(new Blob([ await serialize() ], { type: 'application/json' }));
    const link = document.body.appendChild(document.createElement('a'));
    link.href = url;
    link.download = 'webcyte.json';
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
const loadFromFile = () => {
    const fileInputEl = document.body.appendChild(document.createElement('input'));
    fileInputEl.type = 'file';
    fileInputEl.accept = '.json';
    fileInputEl.style.display = 'none';
    fileInputEl.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }
        try {
            deserialize(await file.text());
            console.log('Model loaded.');
        } catch (error) {
            console.error('Error loading model:', error);
        }
        document.body.removeChild(fileInputEl);
    });
    fileInputEl.click();
};

throw('qq');

//--- ui:




//--- grid:

const grid = new Grid(GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, model);
const seedState = genSeedState();
const targetState = tf.tidy(() => tf.browser.fromPixels(targetCanvas, 4).cast('float32').div(255.0).expandDims(0));

let brushColor = SEED_COLOR;
let brushSize = SEED_SIZE;
let renderOption = 0;

const render = () => {
    if (renderOption === 0) {
        grid.render(gridCtx);
    } else {
        grid.renderLayer(gridCtx, renderOption - 1);
    }
}

const ATTRACTOR_SWITCH_PERIOD = 64;
const ATTRACTOR_BATCH_MAX_COUNT = 2;
const ATTRACTOR_MAX_OVERRUN = EPOCH_LENGTH_MAX * 16;
const ATTRACTOR_COST_THRESHOLD = 0.02
let attractorSeedBatch = null;
let attractorTargetBatch = null;
let epochCount = 0;
const postEpoch = (cost) => {
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
const learn = () => {
    for (let i = 0; i < 8; ++i) {
        const epochLength = EPOCH_LENGTH_MIN + Math.round((Math.random() * (EPOCH_LENGTH_MAX - EPOCH_LENGTH_MIN)));
        const currCost = grid.epoch(seedState, targetState, epochLength);
        console.log(`epoch ${ epochCount }: length = ${ epochLength };  cost = ${ currCost }`);
        postEpoch(currCost);
        if (attractorSeedBatch != null && epochCount % 2 === 0) {
            const currCost = grid.epoch(attractorSeedBatch, attractorTargetBatch, Math.round(epochLength));
            console.log(`attractor epoch ${ epochCount }: length = ${ epochLength };  cost = ${ currCost }`);
        }
        ++epochCount;
    }
}


//--- loop:

const INFO_UPDATE_INTERVAL = 1000; // ms.
const infoDiv = document.getElementById('info');
let prevFrameTime = 0;
let frameCount = 0;
let isPaused = true;
let isLearning = false;
const onFrame = time => {
    const dT = time - prevFrameTime;
    if (dT >= INFO_UPDATE_INTERVAL) {
        const { numBytes, numTensors, numDataBuffers } = tf.memory();
        infoDiv.innerText = `MEM: bytes = ${ numBytes }; tensors = ${ numTensors }; buffers = ${ numDataBuffers }  |  FPS: ${ Math.round(frameCount * (INFO_UPDATE_INTERVAL / dT)) }`;
        frameCount = 0;
        prevFrameTime = time;
    }
    ++frameCount;
    if (isLearning) {
        learn();
    } else {
        grid.cycle();
    }
    render();
    if (isPaused) {
        console.log('paused');
    } else {
        window.requestAnimationFrame(onFrame);
    }
};



gridCanvas.onwheel = (event) => {
    if (event.deltaY > 0) {
        ++renderOption;
    } else if (event.deltaY < 0) {
        --renderOption;
    }
    if (renderOption > grid.depth) {
        renderOption = 0;
    } else if (renderOption < 0) {
        renderOption = grid.depth;
    }
    render();
    console.log('renderOption', renderOption);
}
gridCanvas.onmousedown = gridCanvas.onmousemove = (event) => {
    if (event.buttons & 1 === 1) {
        const x = Math.floor((event.offsetX * GRID_WIDTH) / gridCanvas.offsetWidth);
        const y = Math.floor((event.offsetY * GRID_HEIGHT) / gridCanvas.offsetHeight);
        grid.paint(x, y, brushSize, brushColor);
    }
    render();
};
targetCanvas.onmousedown = (event) => {
    const x = Math.floor((event.offsetX * GRID_WIDTH) / targetCanvas.offsetWidth);
    const y = Math.floor((event.offsetY * GRID_HEIGHT) / targetCanvas.offsetHeight);
    const pixel = targetCtx.getImageData(x, y, 1, 1).data;
    brushColor = `rgba(${ pixel[0] }, ${ pixel[1] }, ${ pixel[2] }, ${ pixel[3] })`;
};



//--- init:

window.onload = async () => {
    document.getElementById('app').style.display = 'block';
    await tf.ready();
    if (DEV_MODE) {
        console.log('DEV_MODE: TFJS backend, version', tf.getBackend(), tf.version.tfjs);
    } else {
        tf.enableProdMode();
    }
};