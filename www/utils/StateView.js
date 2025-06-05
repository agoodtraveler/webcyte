class StateView {
    static ZOOM_FACTOR = 4 * window.devicePixelRatio;
    state = null;
    div = null;
    headerDiv = null;
    ctx = null;
    slider = null;
    onPointer = null;
    isEditable = false;
    paintCtx = null;
    constructor(state, title, isEditable = false) {
        this.state = state;
        this.div = makeDiv('column');
        this.div.style.width = `${ state.width * StateView.ZOOM_FACTOR }px`;
        this.div.style.height = `${ state.height * StateView.ZOOM_FACTOR }px}`;
        this.headerDiv = this.div.appendChild(makeDiv('row'));
        this.headerDiv.style['justify-content'] = 'space-between';
        this.headerDiv.style['align-items'] = 'center';
        this.headerDiv.appendChild(document.createElement('h3')).innerText = title;
        this.ctx = this.div.appendChild(makeCanvas(state.width, state.height)).getContext('2d');
        this.ctx.canvas.onpointermove = this.ctx.canvas.onpointerdown = this.ctx.canvas.onponinterup = (event) => {
            if (this.onPointer) {
                this.onPointer(event.offsetX / StateView.ZOOM_FACTOR, event.offsetY / StateView.ZOOM_FACTOR, event.buttons);
            }
        }
        const controlsDiv = this.div.appendChild(makeDiv('row'));
        const label = controlsDiv.appendChild(document.createElement('label'));
        label.innerText = 'layer: RGBA';
        label.style.width = `${ label.innerText.length }ch`;
        label.setAttribute('for', 'layerSelector');
        this.slider = controlsDiv.appendChild(makeSlider(0, state.depth, () => {
            this.render();
            label.innerHTML = `layer: ${ this.slider.value == 0 ? 'RGBA' : this.slider.value - 1 }`;
        }));
        this.slider.style['flex'] = 1;
        this.slider.setAttribute('name', 'layerSelector');
        this.slider.setAttribute('title', 'Select layer to render (0 = composit RGBA, from first layers)');

        this.isEditable = isEditable;
        if (this.isEditable) {
            this.paintCtx = makeCanvas(state.width, state.height).getContext('2d');
        }
    }
    async render() {
        await this.state.render(this.ctx, Number(this.slider.value));
    }

    paint(x, y, size, color) {
        if (!this.isEditable) {
            throw new Error('Trying to paint using a non-editable StateView.');
        }
        this.paintCtx.clearRect(0, 0, this.paintCtx.canvas.width, this.paintCtx.canvas.height);
        this.paintCtx.fillStyle = color;
        this.paintCtx.fillRect(x - (size / 2), y - (size / 2), size, size);
        this.state.paint(this.paintCtx.canvas);
    }
}
