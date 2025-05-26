const DEV_MODE = true;



const makeDiv = (className) => {
    const div = document.createElement('div');
    div.className = className;
    return div;
}
const makeButton = (title, onClick = () => console.log('onClick', title)) => {
    const btn = document.createElement('button');
    btn.onclick = onClick;
    btn.innerText = title;
    return btn;
}
const makeCanvas = (width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

const globals = { params: {}, weights: {} };
const units = [];
const shared = {};
const mainDiv = document.getElementById('main');

const runUnit = (unit) => {
    try {
        const fn = new Function('console', 'params', 'weights', 'shared', 'prefixDiv', 'suffixDiv', unit.code);
        unit.clearUI;
        fn(unit.console, globals.params, globals.weights, shared, unit.prefixDiv, unit.suffixDiv);
    } catch (error) {
        const message = error.message;
        const stackLines = error.stack?.split('\n');
        console.log(message, stackLines[0]);
    }
}
const delUnit = (unit) => {
    unit.div.parentElement.removeChild(unit.div);
    units.splice(units.indexOf(unit), 1);
    units.forEach((currUnit, i) => currUnit.div.style.order = (i * 2) + 1);
    updateInserts();
}
const addUnit = (name, code, atIndex = units.length) => {
    const unit = new Unit(name, code, runUnit, delUnit);
    units.splice(atIndex, 0, unit);
    units.forEach((currUnit, i) => currUnit.div.style.order = (i * 2) + 1);
    mainDiv.appendChild(unit.div);
    updateInserts();
    return unit;
}

const updateInserts = () => {
    mainDiv.querySelectorAll('.insert').forEach(div => div.parentElement.removeChild(div));
    for (let i = 0; i <= units.length; ++i) {
        const div = mainDiv.appendChild(makeDiv('insert'));
        const order = i * 2;
        div.style.order = order;
        const btn = div.appendChild(makeButton('+', () => addUnit(`UNIT ${ i }`, '// Hello World!', i)));
    }
}

const reset = () => {
    globals.params = {};
    globals.weights = {};
    units.length = 0;
    mainDiv.innerHTML = '';
    updateInserts();
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
    reset();
    src.units.forEach(currUnit => addUnit(currUnit.name, currUnit.code));
}



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

window.onload = async () => {
    await tf.ready();
    if (DEV_MODE) {
        console.log('DEV_MODE: TFJS backend, version', tf.getBackend(), tf.version.tfjs);
    } else {
        tf.enableProdMode();
    }
    addUnit('params', DEFAULT_PARAMS_CODE);
    addUnit('weights', DEFAULT_WEIGHTS_CODE);
    addUnit('target', DEFAULT_TARGET_CODE);
    addUnit('cycle', DEFAULT_CYCLE_CODE);
    addUnit('learn', DEFAULT_LEARN_CODE);
    addUnit('grid', DEFAULT_GRID_CODE);
    updateInserts();
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
