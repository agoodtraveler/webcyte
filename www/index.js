const DEV_MODE = true;

const GRID_WIDTH = 48;
const GRID_HEIGHT = GRID_WIDTH;
const GRID_DEPTH = 16;
const INPUT_CHANNEL_MULTIPLIER = 1;
const DENSE_LAYER_SIZE = 128;

const INIT_WEIGHT_MIN = -0.1;
const INIT_WEIGHT_MAX = 0.1;

const MIN_EPOCH_LENGTH = 64;
const MAX_EPOCH_LENGTH = 96;
const CELL_FIRING_RATE = 0.5;
const LIVE_THRESHOLD = 0.1;

const SAMPLE ='🙂'; // '🌈'; // '🙂'; // '🤖'; // '🦎'; // '🌼';
const SAMPLE_HEIGHT = 0.5 * GRID_HEIGHT;



const appDiv = document.getElementById('app');
appDiv.style.display = 'block';

const targetCanvas = document.getElementById('targetCanvas');
targetCanvas.width = GRID_WIDTH;
targetCanvas.height = GRID_HEIGHT;
const targetCtx = targetCanvas.getContext('2d');

let selectedColor = '#FFFFFFFF';
let brushSize = 2;

targetCanvas.onmousedown = (event) => {
    const x = Math.floor((event.offsetX * GRID_WIDTH) / targetCanvas.offsetWidth);
    const y = Math.floor((event.offsetY * GRID_HEIGHT) / targetCanvas.offsetHeight);
    // console.log(`targetCanvas:  x = ${ x };  y = ${ y };  values = ${ targetTensor.slice([x, y, 0], [1, 1, 4]).dataSync() }`);
    const pixel = targetCtx.getImageData(x, y, 1, 1).data;
    selectedColor = `rgba(${ pixel[0] }, ${ pixel[1] }, ${ pixel[2] }, ${ pixel[3] })`;
}

const drawTarget = (angle = 0 * Math.PI) => {
    targetCtx.font = `${ SAMPLE_HEIGHT }px monospace`;
    let sampleMeasurements = targetCtx.measureText(SAMPLE);
    targetCtx.resetTransform();
    targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    targetCtx.fillStyle = '#00000000';
    targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
    targetCtx.fillStyle = '#000000FF';
    targetCtx.translate((GRID_WIDTH) / 2, (GRID_HEIGHT) / 2);
    targetCtx.rotate(angle);
    targetCtx.fillText(SAMPLE, -0.5 * sampleMeasurements.width, 0.5 * (SAMPLE_HEIGHT - sampleMeasurements.fontBoundingBoxDescent)); 
}

drawTarget();
const targetTensor = tf.browser.fromPixels(targetCanvas, 4).cast('float32').div(255.0);

const gridCanvas = document.getElementById('gridCanvas');
gridCanvas.width = GRID_WIDTH;
gridCanvas.height = GRID_HEIGHT;
const gridCtx = gridCanvas.getContext('2d');

let shouldPaint = false;



let gridState = tf.zeros([ GRID_HEIGHT, GRID_WIDTH, GRID_DEPTH ]);
let optimizer = tf.train.adam();
const setLearningRate = rate => {
    tf.dispose(optimizer);
    optimizer = tf.train.adam(rate);
    console.log('learning rate set', rate);
}

gridCanvas.onmousedown = gridCanvas.onmousemove = (event) => {
    if (event.buttons & 1 === 1) {
        const x = Math.floor((event.offsetX * GRID_WIDTH) / gridCanvas.offsetWidth);
        const y = Math.floor((event.offsetY * GRID_HEIGHT) / gridCanvas.offsetHeight);
        gridCtx.fillStyle = selectedColor;
        gridCtx.fillRect(x, y, brushSize, brushSize);
        shouldPaint = true;
    }
    // console.log(`gridCanvas: x = ${ x };  y = ${ y };  values = ${ gridState.slice([x, y, 0], [1, 1, GRID_DEPTH]).dataSync() }`);
}

const shapes = [
    [ 3, 3, GRID_DEPTH, GRID_DEPTH * INPUT_CHANNEL_MULTIPLIER ],
    [ 1, 1, GRID_DEPTH * INPUT_CHANNEL_MULTIPLIER, DENSE_LAYER_SIZE ],
    [ 1, 1, DENSE_LAYER_SIZE, GRID_DEPTH ]
];
const initRndWeights = () => shapes.map((currShape, layerIndex) => {
    const kernel = tf.variable(tf.randomUniform(currShape, INIT_WEIGHT_MIN, INIT_WEIGHT_MAX, 'float32'));
    const bias = tf.variable(tf.zeros([ currShape[3] ]));
    return [ kernel, bias ];
});
const initLayers = (weights) =>  [
    state => state.conv2d(weights[0][0], 1, 'same'),
    state => state.conv2d(weights[1][0], 1, 'same').add(weights[1][1]).relu(),
    state => state.conv2d(weights[2][0], 1, 'same').add(weights[2][1]).tanh().div(16.0),
];

let weights = initRndWeights();
let layers = initLayers(weights);
const model = inputState => layers.reduce((currState, layer) => layer(currState), inputState);



const render = (state, ctx) => {
    const rgbaArray = new Uint8ClampedArray(state.slice([ 0, 0, 0 ], [ GRID_HEIGHT, GRID_WIDTH, 4 ]).mul(255).cast('int32').dataSync());
    ctx.putImageData(new ImageData(rgbaArray, GRID_WIDTH, GRID_HEIGHT), 0, 0);
}
const paint = (toState, fromCanvas) => {
    return tf.concat([ tf.browser.fromPixels(fromCanvas, 4).cast('float32').div(255.0), toState.slice([ 0, 0, 4 ]) ], 2);
}



const cycle = (state) => {
    const alpha = state.slice([ 0, 0, 3 ], [ GRID_HEIGHT, GRID_WIDTH, 1 ]);
    const liveMask = tf.pool(alpha, [ 3, 3 ], 'max', 'same', [ 1, 1 ]).sub(LIVE_THRESHOLD).mul(10).sigmoid(); // greater(LIVE_THRESHOLD).cast('float32');
    const rndMask = tf.randomUniform([ GRID_HEIGHT, GRID_WIDTH ]).less(CELL_FIRING_RATE).cast('float32').expandDims(2);
    return state.add(model(state.mul(liveMask)).mul(rndMask));
}

const seed = document.createElement('canvas').getContext('2d');
seed.canvas.width = GRID_WIDTH;
seed.canvas.height = GRID_HEIGHT;
seed.clearRect(0, 0, GRID_WIDTH, GRID_HEIGHT);
seed.fillStyle = '#00000000';
seed.fillRect(0, 0, GRID_WIDTH, GRID_HEIGHT);
seed.fillStyle = '#FFFFFFFF';
seed.fillRect(Math.floor(GRID_WIDTH / 2), Math.floor(GRID_HEIGHT / 2), 2, 2);
const seedTensor = tf.browser.fromPixels(seed.canvas, 4).cast('float32').div(255.0);
const seedAlpha = seedTensor.slice([ 0, 0, 3 ], [ GRID_HEIGHT, GRID_WIDTH, 1 ]);
const seedState = seedTensor.concat(seedAlpha.tile([ 1, 1, GRID_DEPTH - 4 ]), 2);



const epoch = (state, epochLength = MIN_EPOCH_LENGTH + Math.round((Math.random() * (MAX_EPOCH_LENGTH - MIN_EPOCH_LENGTH)))) => {
    const cost = optimizer.minimize(() => tf.tidy(() => {
        for (let i = 0; i < epochLength; ++i) {
            state = cycle(state);
        }
        tf.keep(state);
        return tf.losses.meanSquaredError(targetTensor, state.slice([ 0, 0, 0 ], [ GRID_HEIGHT, GRID_WIDTH, 4 ]));
    }), true).dataSync()[0];
    console.log(`epochLength = ${ epochLength };  cost = ${ cost }`);
    return state;
}



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
    const nextState = tf.tidy(() => {
        let state = gridState;
        if (shouldPaint) {
            state = paint(state, gridCanvas);
            shouldPaint = false;
        }
        if (isLearning) {
            state = epoch(seedState);
        } else {
            state = cycle(state);
        }
        render(state, gridCtx);
        return state;
    });
    tf.dispose(gridState);
    gridState = nextState;
    // drawTarget(Math.PI * 0.001 * time);
    if (!isPaused) {
        window.requestAnimationFrame(onFrame);
    } else {
        console.log('paused');
    }
}



const run = () => {
    if (isPaused) {
        isPaused = false;
        window.requestAnimationFrame(onFrame);
    }
};
const step = () => {
    if (isPaused) {
        window.requestAnimationFrame(onFrame);
    } else {
        isPaused = true;
    }
};
const toggleMode = (btnEl) => {
    isLearning = !isLearning;
    btnEl.innerText = isLearning ? 'eval' : 'learn';
}

const save = () => {
    const weightsStr = JSON.stringify(weights.map(layer => [ layer[0].arraySync(), layer[1].arraySync() ]));
    const url = URL.createObjectURL(new Blob([ weightsStr ], { type: 'application/json' }));
    const link = document.body.appendChild(document.createElement('a'));
    link.href = url;
    link.download = 'weights.json';
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
const load = () => {
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
            const weightsData = JSON.parse(await file.text());
            weights.forEach(([ kernel, bias ]) => {
                tf.dispose(kernel);
                tf.dispose(bias);
            });
            weights = weightsData.map(([ kernelValues, biasValues ]) => [
                tf.variable(tf.tensor(kernelValues)),
                tf.variable(tf.tensor(biasValues))
            ]);
            layers = initLayers(weights);
            console.log('Weights loaded.');
        } catch (error) {
            console.error('Error loading weights:', error);
        }
        document.body.removeChild(fileInputEl);
    });
    fileInputEl.click();
}



window.onload = async () => {
    await tf.ready();
    if (DEV_MODE) {
        console.log('DEV_MODE: TFJS backend, version', tf.getBackend(), tf.version.tfjs);
        console.log('Optimizer', optimizer);
    } else {
        tf.enableProdMode();
    }
}
