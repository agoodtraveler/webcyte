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