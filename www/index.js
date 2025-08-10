const VERSION = '0.1';
var DEV_MODE = true;   // saves projects to .js ('defaultProject.js') instead of .json, if true.

let project = null;

window.onload = async () => {
    await tf.ready();
    const info = `webcyte v${ VERSION }:  DEV_MODE = ${ DEV_MODE }; TFJS backend = ${ tf.getBackend() };  TFJS version = ${ tf.version.tfjs }`;
    console.log(info);
    project = makeDefaultProject();
    project.log(null, info);
    document.getElementById('mainPanel').appendChild(project.div);
    document.getElementById('logPanel').appendChild(project.logDiv);
    project.run();
}



const logPanelDiv = document.getElementById('logPanel');
if (window.matchMedia('(min-width: 80ch)').matches) {
    logPanelDiv.style.width = `${  0.4 * window.innerWidth }px`;
    logPanelDiv.classList.remove('hidden');
}

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
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onRelease);
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onRelease);
}
const toggleLog = () => logPanelDiv.classList.toggle('hidden');

const runProject = () => {
    project.run();
}

const saveToFile = async () => {
    const makeURL = async () => {
        if (DEV_MODE) { 
            return URL.createObjectURL(new Blob([ `const makeDefaultProject = () => {
                const project = new Project();
                project.deserialize("${ (await project.serialize()).replaceAll('\\', '\\\\').replaceAll('"', '\\"') }");
                return project;
            }` ], { type: 'application/json' }));
        } else {
            return URL.createObjectURL(new Blob([ await project.serialize() ], { type: 'application/json' }));
        }
    }
    const url = await makeURL();
    const link = document.body.appendChild(document.createElement('a'));
    link.href = url;
    link.download = DEV_MODE ? 'defaultProject.js' : 'webcyte.json';
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
            project.deserialize(await file.text());
            project.log(null, 'Model loaded.');
        } catch (error) {
            console.error('Error loading model:', error);
        }
        document.body.removeChild(fileInputEl);
    });
    fileInputEl.click();
};
