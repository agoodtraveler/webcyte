class Substrate {
    vars = {};
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
    removeUnit(unit) {
        unit.cleanup();
        unit.div.parentElement.removeChild(unit.div);
        this.units.splice(this.units.indexOf(unit), 1);
        this.units.forEach((currUnit, i) => currUnit.div.style.order = (i * 2) + 1);
        this.#updateInserts();
    }

    run() {
        this.units.forEach(currUnit => currUnit.run());
    }

    async serialize() {
        const dst = {
            vars: {},
            units: this.units.map((currUnit) => ({ name: currUnit.name, code: currUnit.code })),
        };
        for (const currName in this.vars) {
            const currWeights = this.vars[currName];
            dst.vars[currName] = {
                isVariable: currWeights instanceof tf.Variable,
                value: await currWeights.array()
            };
        }
        return JSON.stringify(dst);
    }
    deserialize(jsonStr) {
        const src = JSON.parse(jsonStr);
        for (let i = 0; i < this.units.length; ++i) {
            this.units[i].cleanup();
        }
        for (let currName in this.vars) {
            tf.dispose(this.vars[currName]);
        }
        this.vars = {};
        this.units = [];
        this.div.innerHTML = '';

        for (const currName in src.vars) {
            const currSrcWeights = src.vars[currName];
            const tensor = tf.tensor(currSrcWeights.value);
            this.vars[currName] = currSrcWeights.isVariable ? tf.variable(tensor) : tensor;
        }
        src.units.forEach(currUnit => this.insertUnit(currUnit.name, currUnit.code));
    }



    #updateInserts() {
        this.div.querySelectorAll('.insert').forEach(currEl => currEl.parentElement.removeChild(currEl));
        for (let i = 0; i <= this.units.length; ++i) {
            const currInsertDiv = this.div.appendChild(makeDiv('insert'));
            const order = i * 2;
            currInsertDiv.style.order = order;
            currInsertDiv.appendChild(makeButton('<svg class="ionicon" viewBox="0 0 512 512"><use href="#addImg"></use></svg>', `Insert new unit at: ${ i }`, () => this.insertNewUnit(i)));
        }
    }
}