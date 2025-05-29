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
    if (DEV_MODE) {
        console.log('DEV_MODE: TFJS backend, version', tf.getBackend(), tf.version.tfjs);
    } else {
        tf.enableProdMode();
    }
    substrate = makeDefaultSubstrate();
    mainDiv.appendChild(substrate.div);
    substrate.run();
}



const runSubstrate = () => {
    substrate.run();
}

const saveToFile = async () => {
    const url = URL.createObjectURL(new Blob([ await substrate.serialize() ], { type: 'application/json' }));
    const link = document.body.appendChild(document.createElement('a'));
    link.href = url;
    link.download = 'substrate.json';
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
