const DEV_MODE = true;

const GRID_WIDTH = 48;
const GRID_HEIGHT = GRID_WIDTH;
const GRID_DEPTH = 16;

const INPUT_CHANNEL_MULTIPLIER = 1;
const DENSE_LAYER_SIZE = 128;
const INIT_WEIGHT_MIN = -0.1;
const INIT_WEIGHT_MAX = 0.1;

const SAMPLE ='🙂'; // '🌈'; // '🙂'; // '🤖'; // '🦎'; // '🌼';
const SAMPLE_HEIGHT = 0.5 * GRID_HEIGHT;

const SEED_COLOR = '#FFFFFFFF';
const SEED_SIZE = 2;



//--- model:

const LAYER_SHAPES = [
    [ 3, 3, GRID_DEPTH, GRID_DEPTH * INPUT_CHANNEL_MULTIPLIER ],
    [ 1, 1, GRID_DEPTH * INPUT_CHANNEL_MULTIPLIER, DENSE_LAYER_SIZE ],
    [ 1, 1, DENSE_LAYER_SIZE, GRID_DEPTH ]
];

const model = {
    cellFiringRate: 0.5,
    liveThreshold: 0.1,
    /*decayRate: 0.01,*/
    weights: LAYER_SHAPES.map((currShape) => {
        const kernel = tf.variable(tf.randomUniform(currShape, INIT_WEIGHT_MIN, INIT_WEIGHT_MAX, 'float32'));
        const bias = tf.variable(tf.zeros([ currShape[3] ]));
        return [ kernel, bias ];
    }),
    fn: (state, weights) => {
        state = state.conv2d(weights[0][0], 1, 'same');
        state = state.conv2d(weights[1][0], 1, 'same').relu();
        state = state.conv2d(weights[2][0], 1, 'same').tanh();
        return state;
    }
};



//--- ui:

const gridCanvas = document.getElementById('gridCanvas');
gridCanvas.width = GRID_WIDTH;
gridCanvas.height = GRID_HEIGHT;
const gridCtx = gridCanvas.getContext('2d');

const targetCanvas = document.getElementById('targetCanvas');
targetCanvas.width = GRID_WIDTH;
targetCanvas.height = GRID_HEIGHT;
const targetCtx = targetCanvas.getContext('2d');
targetCtx.font = `${ SAMPLE_HEIGHT }px monospace`;
let sampleMeasurements = targetCtx.measureText(SAMPLE);
targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
targetCtx.fillStyle = '#000000FF';
targetCtx.translate((GRID_WIDTH) / 2, (GRID_HEIGHT) / 2);
targetCtx.fillText(SAMPLE, -0.5 * sampleMeasurements.width, 0.5 * (SAMPLE_HEIGHT - sampleMeasurements.fontBoundingBoxDescent));

const paintCtx = document.createElement('canvas').getContext('2d');
paintCtx.canvas.width = GRID_WIDTH;
paintCtx.canvas.height = GRID_HEIGHT;
const genSeedState = () => {
    paintCtx.clearRect(0, 0, GRID_WIDTH, GRID_HEIGHT);
    paintCtx.fillStyle = SEED_COLOR;
    paintCtx.fillRect((GRID_WIDTH - SEED_SIZE) / 2, (GRID_HEIGHT - SEED_SIZE) / 2, SEED_SIZE, SEED_SIZE);
    return tf.tidy(() => {
        const seedImgTensor = tf.browser.fromPixels(paintCtx.canvas, 4).cast('float32').div(255.0);
        const seedAlpha = seedImgTensor.slice([ 0, 0, 3 ], [ -1, -1, 1 ]);
        return seedImgTensor.concat(seedAlpha.tile([ 1, 1, GRID_DEPTH - 4 ]), 2).expandDims(0);
    });
}


//--- grid:

const grid = new Grid(GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, model);
const seedState = genSeedState();
const targetState = tf.browser.fromPixels(targetCanvas, 4).cast('float32').div(255.0).expandDims(0);

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
const epoch = () => {
    const epochLength = this.minEpochLength + Math.round((Math.random() * (this.maxEpochLength - this.minEpochLength)));
    for (let i = 0; i < 8; ++i) {
        grid.epoch(seedState, targetState, epochLength);
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
        epoch();
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



//--- user actions:

const cls = () => {
    grid.clear();
    render();
};
const run = () => {
    if (isPaused) {
        isPaused = false;
        window.requestAnimationFrame(onFrame);
        console.log('run');
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
};
const addSample = () => {
    
};

const saveToFile = async () => {
    const url = URL.createObjectURL(new Blob([ await grid.serializeModel() ], { type: 'application/json' }));
    const link = document.body.appendChild(document.createElement('a'));
    link.href = url;
    link.download = 'weights.json';
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
            grid.deserializeModel(await file.text());
            console.log('Model loaded.');
        } catch (error) {
            console.error('Error loading model:', error);
        }
        document.body.removeChild(fileInputEl);
    });
    fileInputEl.click();
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