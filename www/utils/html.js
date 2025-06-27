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
const makeDetails = (summary) => {
    const details = document.createElement('details');
    details.appendChild(document.createElement('summary')).innerText = summary;
    return details;
}
const makeA = (href) => {
    const a = document.createElement('a');
    a.setAttribute('href', href);
    return a;
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
const makeLogLine = ({ time, unit, text }, className = 'info') => {
    const div = makeDiv(`line ${ className }`);
    const t = new Date(time);
    // div.appendChild(makeDiv('time')).innerText = `[ ${ String(t.getDate()).padStart(2, '0') }/${ String(t.getMonth() + 1).padStart(2, '0') }/${ String(t.getFullYear()).substring(2) } ${ String(t.getHours()).padStart(2, '0') }:${ String(t.getMinutes()).padStart(2, '0') }:${ String(t.getSeconds()).padStart(2, '0') }:${ String(t.getMilliseconds()).padStart(3, '0') } ]`;
    div.appendChild(makeDiv('time')).innerText = `[ ${ String(t.getHours()).padStart(2, '0') }:${ String(t.getMinutes()).padStart(2, '0') }:${ String(t.getSeconds()).padStart(2, '0') }:${ String(t.getMilliseconds()).padStart(3, '0') } ]`;
    if (unit) {
        div.appendChild(makeA(`#unit_${ unit }`)).innerText = unit;
    }
    div.appendChild(makeDiv('text')).innerHTML = text;
    return div;
}