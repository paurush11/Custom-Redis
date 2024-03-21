const { Encoder } = require("./Utils/encoder");

class dataStore {
    constructor() {
        this.map = new Map();
        this.streamCursor = 0;
        this.streamTimeStamps = [];
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
        const value = this.map.get(key)
        if (!value) return "none";
        if (typeof value === "string")
            return "string"
        return "stream"
    }

    insertStream(key, value, stream_key) {
        const [millisecondsTime, sequenceNumber] = stream_key.split("-");
        if (this.streamCursor === 0) {
            if (millisecondsTime === '0' && sequenceNumber === '0')
                return Encoder.generateStreamError(false);
        } else {
            const [prevMillisecondsTime, prevSequenceNumber] = this.streamTimeStamps[this.streamCursor - 1].split("-");
            if (millisecondsTime < prevMillisecondsTime || (prevMillisecondsTime === millisecondsTime && sequenceNumber <= prevSequenceNumber)) {
                return Encoder.generateStreamError(true);
            }

        }
        this.streamTimeStamps.push(stream_key);
        this.streamCursor += 1;
        this.map.set(key, value);
    }

    has() {

    }
}

module.exports = {
    dataStore
}