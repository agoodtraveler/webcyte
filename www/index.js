const DEV_MODE = true;



const makeDiv = (className) => {
    const div = document.createElement('div');
    div.className = className;
    return div;
}
const makeButton = (titleOrHTML, title, onClick = () => console.log('onClick', titleOrHTML)) => {
    const btn = document.createElement('button');
    btn.setAttribute('title', title);
    btn.onclick = onClick;
    btn.innerHTML = titleOrHTML;
    return btn;
}
const makeCanvas = (width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
}
const makeSlider = (min, max, onChangeFn) => {
    const input = document.createElement('input');
    input.setAttribute('type', 'range');
    input.setAttribute('min', min);
    input.setAttribute('max', max);
    input.value = min;
    input.oninput = () => onChangeFn();
    return input;
}

const renderState = async (state, ctx) => {
    const rgbaTensor = tf.tidy(() => state.slice([ 0, 0, 0, 0 ], [ 1, -1, -1, 4 ])
        .mul(255)
        .cast('int32'));
    const rgbaArray = new Uint8ClampedArray(await rgbaTensor.data());
    tf.dispose(rgbaTensor);
    ctx.putImageData(new ImageData(rgbaArray, ctx.canvas.width, ctx.canvas.height), 0, 0);
}
const renderLayer = async (state, ctx, layerNumber = 0) => {
    const rgbaTensor = tf.tidy(() => state.slice([ 0, 0, 0, layerNumber ], [ 1, -1, -1, 1 ])
        .tile([ 1, 1, 1, 3 ])
        .concat(tf.ones([ 1, ctx.canvas.height, ctx.canvas.width, 1 ]), 3)
        .mul(255)
        .cast('int32'));
    const rgbaArray = new Uint8ClampedArray(await rgbaTensor.data());
    tf.dispose(rgbaTensor);
    ctx.putImageData(new ImageData(rgbaArray, ctx.canvas.width, ctx.canvas.height), 0, 0);
}
const drawCanvasOnState = (fromCanvas, toState) => tf.tidy(() => {
    const rgbaTensor = tf.browser.fromPixels(fromCanvas, 4)
        .cast('float32')
        .div(255.0);
    const alphaTensor = rgbaTensor.slice([ 0, 0, 3 ], [ fromCanvas.height, fromCanvas.width, 1 ]);
    const maskTensor = alphaTensor.less(0.5).cast('float32');
    const paintState = rgbaTensor.concat(alphaTensor.tile([ 1, 1, toState.shape[2] - 4 ]), 2)
        .expandDims(0);
    return toState.mul(maskTensor).add(paintState);
});

class StateView {
    div = null;
    ctx = null;
    slider = null;
    onChange = () => console.log('StateView slider onChange');
    constructor(title, width, height, depth) {
        this.div = makeDiv('column');
        this.div.style.width = `${ width * 4 }pt`;
        this.div.style.height = `${ height * 4 }pt}`;
        this.div.appendChild(document.createElement('h3')).innerText = title;
        this.ctx = this.div.appendChild(makeCanvas(width, height)).getContext('2d');
        const controlsDiv = this.div.appendChild(makeDiv('row'));
        const label = controlsDiv.appendChild(document.createElement('label'));
        label.innerText = 'layer:';
        label.setAttribute('for', 'layerSelector');
        this.slider = controlsDiv.appendChild(makeSlider(0, depth, () => this.onChange()));
        this.slider.style['flex'] = 1;
        this.slider.setAttribute('name', 'layerSelector');
        this.slider.setAttribute('title', 'Select layer to render (0 = composit RGBA, from first layers)');
    }
    async render(state) {
        if (this.slider.value == 0) {
            await renderState(state, this.ctx);
        } else {
            await renderLayer(state, this.ctx, this.slider.value - 1);
        }
    }
}



const mainDiv = document.getElementById('main');
mainDiv.onscroll = () => {
    const contentsRect = mainDiv.getBoundingClientRect();
    mainDiv.querySelectorAll('.Unit').forEach(currUnitDiv => {
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

let substrate = null;

window.onload = async () => {
    await tf.ready();
    console.log(`webcyte v0.1:  DEV_MODE = ${ DEV_MODE}; TFJS backend, version`, tf.getBackend(), tf.version.tfjs);
    // TODO: try 'tf.enableProdMode();'?
    substrate = makeDefaultSubstrate();
    mainDiv.appendChild(substrate.div);
    substrate.run();
}



const showNavigator = () => {
    console.log('show navigator');
}

const runSubstrate = () => {
    substrate.run();
}

const saveToFile = async () => {
    const makeURL = async () => {
        if (DEV_MODE) { 
            return URL.createObjectURL(new Blob([ `const makeDefaultSubstrate = () => {
                const substrate = new Substrate();
                substrate.deserialize("${ (await substrate.serialize()).replaceAll('\\', '\\\\').replaceAll('"', '\\"') }");
                return substrate;
            }` ], { type: 'application/json' }));
        } else {
            return URL.createObjectURL(new Blob([ await substrate.serialize() ], { type: 'application/json' }));
        }
    }
    const url = await makeURL();
    const link = document.body.appendChild(document.createElement('a'));
    link.href = url;
    link.download = DEV_MODE ? 'defaultSubstrate.js' : 'substrate.json';
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
            substrate.deserialize(await file.text());
            console.log('Model loaded.');
        } catch (error) {
            console.error('Error loading model:', error);
        }
        document.body.removeChild(fileInputEl);
    });
    fileInputEl.click();
};



// const INFO_UPDATE_INTERVAL = 1000; // ms.
// const infoDiv = document.getElementById('info');
// let prevFrameTime = 0;
// let frameCount = 0;
// let isPaused = true;
// let isLearning = false;
// const onFrame = time => {
//     const dT = time - prevFrameTime;
//     if (dT >= INFO_UPDATE_INTERVAL) {
//         const { numBytes, numTensors, numDataBuffers } = tf.memory();
//         infoDiv.innerText = `MEM: bytes = ${ numBytes }; tensors = ${ numTensors }; buffers = ${ numDataBuffers }  |  FPS: ${ Math.round(frameCount * (INFO_UPDATE_INTERVAL / dT)) }`;
//         frameCount = 0;
//         prevFrameTime = time;
//     }
//     ++frameCount;
//     if (isLearning) {
//         learn();
//     } else {
//         grid.cycle();
//     }
//     render();
//     if (isPaused) {
//         console.log('paused');
//     } else {
//         window.requestAnimationFrame(onFrame);
//     }
// }
