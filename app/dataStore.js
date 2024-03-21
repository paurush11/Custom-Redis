class dataStore {
    constructor() {
        this.map = new Map();
    }

    insert(key, value) {
        this.map.set(key, value);
    }

    insertWithExp(key, value, expiration) {
        this.map.set(key, value);
        setTimeout(() => {
            this.map.delete(key);
        }, expiration)
    }

    get(key) {
        return this.map.get(key);
    }

    type(key) {
        if (!this.map.get(key)) return "none"
        return "string"
    }

    has() {

    }
}

module.exports = {
    dataStore
}