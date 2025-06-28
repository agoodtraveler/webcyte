const VERSION = '0.1';
var DEV_MODE = true;   // saves substrates to .js ('defaultSubstrate.js') instead of .json, if true.

let substrate = null;

window.onload = async () => {
    await tf.ready();
    const info = `webcyte v${ VERSION }:  DEV_MODE = ${ DEV_MODE }; TFJS backend = ${ tf.getBackend() };  TFJS version = ${ tf.version.tfjs }`;
    console.log(info);
    substrate = makeDefaultSubstrate();
    substrate.log(null, info);
    document.getElementById('substrate').appendChild(substrate.div);
    document.getElementById('logPanel').appendChild(substrate.logDiv);
    substrate.run();
}



const logPanelDiv = document.getElementById('logPanel');
logPanelDiv.classList.remove('hidden');
logPanelDiv.style.width = `${  0.4 * window.innerWidth }px`;

const resizeLog = (event) => {
    event.preventDefault();
    event.stopPropagation();
    let startX = event.clientX;
    let startWidth = logPanelDiv.getBoundingClientRect().width;
    const onMove = (ev) => {
        const delta = startX - ev.clientX;
        logPanelDiv.style.width = `${ startWidth + delta }px`;
    }
    const onRelease = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onRelease);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onRelease);
}
const toggleLog = () => logPanelDiv.classList.toggle('hidden');

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
            substrate.log(null, 'Model loaded.');
        } catch (error) {
            console.error('Error loading model:', error);
        }
        document.body.removeChild(fileInputEl);
    });
    fileInputEl.click();
};
