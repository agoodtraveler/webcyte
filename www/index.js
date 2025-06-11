var DEV_MODE = true;   // set to true to save substrate as 'defaultSubstrate.js'
const VERSION = '0.1';



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
