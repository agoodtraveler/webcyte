class GridView extends StateView {
    static PLAY_IMG = `<svg class="ionicon" viewBox="0 0 512 512"><use href="#playImg"></use></svg>`;
    static PAUSE_IMG = `<svg class="ionicon" viewBox="0 0 512 512"><use href="#pauseImg"></use></svg>`;
    toggleBtn = null;
    paintColor = null;
    paintBrushSize = null;
    onFrame = null;
    FPS = 0;
    #isRunning = false;
    constructor(state, title, isEditable = false, color, brushSize) {
        super(state, title, isEditable);
        this.toggleBtn = makeButton(this.#isRunning ? GridView.PAUSE_IMG : GridView.PLAY_IMG, '', () => this.isRunning = !this.isRunning);
        this.headerDiv.appendChild(this.toggleBtn);
        if (isEditable) {
            this.paintColor = color;
            this.paintBrushSize = brushSize;
        }
        this.render();
        this.onPointer = (x, y, buttons) => {
            if (buttons === 1) {
                this.paint(x, y, this.paintBrushSize, this.paintColor);
                this.render();
            }
        }
    }
    set isRunning(shouldBeRunning) {
        const INFO_UPDATE_INTERVAL = 1000; // ms.
        let prevTime = 0;
        let frameCount = 0;
        const onFrame = time => {
            if (this.#isRunning) {
                const dT = time - prevTime;
                if (dT >= INFO_UPDATE_INTERVAL) {
                    this.FPS = Math.round(frameCount * (INFO_UPDATE_INTERVAL / dT));
                    frameCount = 0;
                    prevTime = time;
                    console.log('FPS', this.FPS);
                }
                ++frameCount;
                if (this.onFrame) {
                    try {
                        this.onFrame(time);
                    } catch (error) {
                        substrate.log(null, error.stack, 'error');  // TODO: should have unit.
                    }
                }
                window.requestAnimationFrame(onFrame);
            } else {
                this.toggleBtn.innerHTML = GridView.PLAY_IMG;
                this.toggleBtn.setAttribute('title', 'Run grid.');
            }
        }
        
        if (shouldBeRunning != this.#isRunning) {
            if (shouldBeRunning) {
                this.#isRunning = true;
                window.requestAnimationFrame(onFrame);
                this.toggleBtn.innerHTML = GridView.PAUSE_IMG;
                this.toggleBtn.setAttribute('title', 'Pause grid.');
            } else {
                this.#isRunning = false;
            }
        } 
    }
    get isRunning() {
        return this.#isRunning;
    }
}