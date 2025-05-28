class Substrate {
    weights = {};
    units = [];
    div = null;
    constructor() {
        this.div = makeDiv('Substrate');
    }

    insertUnit(name, code, atIndex = this.units.length) {
        const unit = new Unit(name, code, this);
        this.units.splice(atIndex, 0, unit);
        this.units.forEach((currUnit, i) => currUnit.div.style.order = (i * 2) + 1);
        this.div.appendChild(unit.div);
        this.#updateInserts();
        return unit;
    }
    insertNewUnit(atIndex) {
        const prefix = Unit.DEFAULT_NAME_PREFIX;
        let num = 0;
        let currName = `${ prefix }${ num }`;
        while (this.units.find(x => x.name === currName)) {
            currName = `${ prefix }${ ++num }`
        }
        this.insertUnit(currName, Unit.DEFAULT_CODE, atIndex);
    }
    runUnit(unit) {
        try {
            const fn = new Function('self', 'weights', 'prefixDiv', 'suffixDiv', ...this.units.map(x => x.name), unit.code);
            unit.clearUI();
            fn(unit.self, this.weights, unit.prefixDiv, unit.suffixDiv, ...this.units.map(x => x.self));
        } catch (error) {
            const message = error.message;
            const stackLines = error.stack?.split('\n');
            console.log(message, stackLines[0]);
        }
    }
    removeUnit(unit) {
        unit.div.parentElement.removeChild(unit.div);
        this.units.splice(this.units.indexOf(unit), 1);
        this.units.forEach((currUnit, i) => currUnit.div.style.order = (i * 2) + 1);
        this.#updateInserts();
    }

    run() {
        for (let i = 0; i < this.units.length; ++i) {
            const currUnit = this.units[i];
            this.runUnit(currUnit);
        }
    }

    async serialize() {
        const dst = {
            weights: {},
            units: this.units.map((currUnit) => ({ name: currUnit.name, code: currUnit.code })),
        };
        for (const currName in this.weights) {
            const currWeights = this.weights[currName];
            dst.weights[currName] = {
                isVariable: currWeights instanceof tf.Variable,
                value: await currWeights.array()
            };
        }
        return JSON.stringify(dst);
    }
    deserialize(jsonStr) {
        const src = JSON.parse(jsonStr);
        for (let currName in this.weights) {
            tf.dispose(this.weights[currName]);
        }
        this.weights = {};
        for (let i = 0; i < this.units.length; ++i) {
            // unit.cleanup()
        }
        this.units = [];
        this.div.innerHTML = '';

        for (const currName in src.weights) {
            const currSrcWeights = src.weights[currName];
            const tensor = tf.tensor(currSrcWeights.value);
            this.weights[currName] = currSrcWeights.isVariable ? tf.variable(tensor) : tensor;
        }
        src.units.forEach(currUnit => this.insertUnit(currUnit.name, currUnit.code));
    }



    #updateInserts() {
        this.div.querySelectorAll('.insert').forEach(currEl => currEl.parentElement.removeChild(currEl));
        for (let i = 0; i <= this.units.length; ++i) {
            const currInsertDiv = this.div.appendChild(makeDiv('insert'));
            const order = i * 2;
            currInsertDiv.style.order = order;
            currInsertDiv.appendChild(makeButton('<svg class="ionicon" viewBox="0 0 512 512"><use href="#addImg"></use></svg>', () => this.insertNewUnit(i)));
        }
    }
}