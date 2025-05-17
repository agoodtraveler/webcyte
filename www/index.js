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



//--- model:

const LAYER_SHAPES = [
    [ 3, 3, GRID_DEPTH, GRID_DEPTH * INPUT_CHANNEL_MULTIPLIER ],
    [ 1, 1, GRID_DEPTH * INPUT_CHANNEL_MULTIPLIER, DENSE_LAYER_SIZE ],
    [ 1, 1, DENSE_LAYER_SIZE, GRID_DEPTH ]
];

const model = {
    cellFiringRate: 0.5,
    liveThreshold: 0.1,
    decayRate: 0.01,
    weights: LAYER_SHAPES.map((currShape) => {
        const kernel = tf.variable(tf.randomUniform(currShape, INIT_WEIGHT_MIN, INIT_WEIGHT_MAX, 'float32'));
        const bias = tf.variable(tf.zeros([ currShape[3] ]));
        return [ kernel, bias ];
    }),
    fn: (state, weights) => {
        state = state.conv2d(weights[0][0], 1, 'same');
        state = state.conv2d(weights[1][0], 1, 'same').add(weights[1][1]).relu();
        state = state.conv2d(weights[2][0], 1, 'same').add(weights[2][1]).tanh();
        return state.div(16.0);
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



//--- grid:

const grid = new Grid(GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, model);
grid.targetImgTensor = tf.browser.fromPixels(targetCanvas, 4).cast('float32').div(255.0);

let brushColor = grid.seedColor;
let brushSize = grid.seedSize;



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
        grid.epoch();
    } else {
        grid.cycle();
    }
    grid.render(gridCtx);
    if (isPaused) {
        console.log('paused');
    } else {
        window.requestAnimationFrame(onFrame);
    }
};



//--- user actions:

const cls = () => {
    grid.clear();
    grid.render(gridCtx);
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

gridCanvas.onmousedown = gridCanvas.onmousemove = (event) => {
    if (event.buttons & 1 === 1) {
        const x = Math.floor((event.offsetX * GRID_WIDTH) / gridCanvas.offsetWidth);
        const y = Math.floor((event.offsetY * GRID_HEIGHT) / gridCanvas.offsetHeight);
        grid.paint(x, y, brushSize, brushColor);
    }
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