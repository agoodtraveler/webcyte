class StateView {
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
        this.headerDiv = this.div.appendChild(makeDiv('row'));
        this.headerDiv.style['justify-content'] = 'space-between';
        this.headerDiv.style['align-items'] = 'center';
        this.headerDiv.appendChild(document.createElement('h3')).innerText = title;
        this.ctx = this.div.appendChild(makeCanvas(state.width, state.height)).getContext('2d');
        this.ctx.canvas.onpointermove = this.ctx.canvas.onpointerdown = this.ctx.canvas.onponinterup = (event) => {
            if (this.onPointer) {
                const x = this.ctx.canvas.offsetWidth / state.width;
                const y = this.ctx.canvas.offsetHeight / state.height;
                this.onPointer(event.offsetX / x, event.offsetY / y, event.buttons);
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
        const layerNumber = Number(this.slider.value);
        let rgbaTensor = null;
        if (layerNumber === 0) {
            rgbaTensor = tf.tidy(() => this.state.tensor.slice([ 0, 0, 0, 0 ], [ 1, -1, -1, 4 ])
                .mul(255)
                .cast('int32'));
        } else {
            rgbaTensor = tf.tidy(() => this.state.tensor.slice([ 0, 0, 0, layerNumber - 1 ], [ 1, -1, -1, 1 ])
                .tile([ 1, 1, 1, 3 ])
                .concat(tf.ones([ 1, this.state.height, this.state.width, 1 ]), 3)
                .mul(255)
                .cast('int32'));
        }
        const rgbaArray = new Uint8ClampedArray(await rgbaTensor.data());
        tf.dispose(rgbaTensor);
        this.ctx.putImageData(new ImageData(rgbaArray, this.state.width, this.state.height), 0, 0);
    }

    paint(x, y, size, color) {
        if (!this.isEditable) {
            return;
            // throw new Error('Trying to paint using a non-editable StateView.');
        }
        this.paintCtx.clearRect(0, 0, this.paintCtx.canvas.width, this.paintCtx.canvas.height);
        this.paintCtx.fillStyle = color;
        this.paintCtx.fillRect(x - (size / 2), y - (size / 2), size, size);


        this.state.tensor = (tf.tidy(() => {
            const rgbaTensor = tf.browser.fromPixels(this.paintCtx.canvas, 4)
                .cast('float32')
                .div(255.0);
            const alphaTensor = rgbaTensor.slice([ 0, 0, 3 ], [ this.ctx.canvas.height, this.ctx.canvas.width, 1 ]);
            const maskTensor = alphaTensor.less(0.5).cast('float32');
            const paintState = rgbaTensor.concat(alphaTensor.tile([ 1, 1, this.state.depth - 4 ]), 2).expandDims(0);
            return this.state.tensor.mul(maskTensor).add(paintState);
        }));
    }
}
