class State {
    batchSize = -1;
    width = -1;
    height = -1;
    depth = -1;
    constructor(tensor) {
        this.tensor = tensor;
    }
    #tensor = null;
    set tensor(newTensor) {
        if (this.#tensor && this.#tensor != newTensor) {
            tf.dispose(this.#tensor);
        }
        this.#tensor = newTensor;
        const [ batchSize, height, width, depth ] = newTensor.shape;
        this.batchSize = batchSize;
        this.height = height;
        this.width = width;
        this.depth = depth;
    }
    get tensor() {
        return this.#tensor;
    }
    dispose() {
        tf.dispose(this.#tensor);
    }
}