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

    compareStreamValues(ms, sq, pms, psq) {
        if (ms === '0' && sq === '0')
            return Encoder.generateStreamError(false);
        if (sq === "*") {

        }
    }

    insertStream(key, value, stream_key) {

        if (stream_key === "*") {
            if (this.streamCursor === 0) {
                let newSequenceNumber = '0'
                let newMillisecondsTime = '1526919030474'
                this.streamTimeStamps.push([newMillisecondsTime, newSequenceNumber].join("-"));
                this.streamCursor += 1;
                this.map.set(key, value);
            } else {
                const [prevMillisecondsTime, prevSequenceNumber] = this.streamTimeStamps[this.streamCursor - 1].split("-");
                let newSequenceNumber = '0'
                let newMillisecondsTime = '1526919030474'
            }
        } else {
            const [millisecondsTime, sequenceNumber] = stream_key.split("-");

            if (sequenceNumber === '*') {
                if (this.streamCursor === 0) {
                    let newSequenceNumber = millisecondsTime === '0' ? '1' : '0'
                    let newMillisecondsTime = millisecondsTime
                    this.streamTimeStamps.push([newMillisecondsTime, newSequenceNumber].join("-"));
                    this.streamCursor += 1;
                    this.map.set(key, value);

                } else {
                    const [prevMillisecondsTime, prevSequenceNumber] = this.streamTimeStamps[this.streamCursor - 1].split("-");
                    if (millisecondsTime < prevMillisecondsTime) {
                        return Encoder.generateStreamError(true);
                    } else if (prevMillisecondsTime === millisecondsTime) {
                        let newSequenceNumber = (Number(prevSequenceNumber) + 1).toString();
                        let newMillisecondsTime = millisecondsTime
                    } else {
                        let newSequenceNumber = '0'
                        let newMillisecondsTime = millisecondsTime
                    }

                    this.streamTimeStamps.push([newMillisecondsTime, newSequenceNumber].join("-"));
                    this.streamCursor += 1;
                    this.map.set(key, value);
                }

            } else {
                let newSequenceNumber = sequenceNumber
                let newMillisecondsTime = millisecondsTime
                if (this.streamCursor === 0) {
                    if (millisecondsTime === '0' && sequenceNumber === '0')
                        return Encoder.generateStreamError(false);
                } else {
                    const [prevMillisecondsTime, prevSequenceNumber] = this.streamTimeStamps[this.streamCursor - 1].split("-");
                    if (millisecondsTime === '0' && sequenceNumber === '0')
                        return Encoder.generateStreamError(false);
                    if (millisecondsTime < prevMillisecondsTime || (prevMillisecondsTime === millisecondsTime && sequenceNumber <= prevSequenceNumber)) {
                        return Encoder.generateStreamError(true);
                    }
                }
                this.streamTimeStamps.push([newMillisecondsTime, newSequenceNumber].join("-"));
                this.streamCursor += 1;
                this.map.set(key, value);
            }
        }
    }

    has() {

    }
}

module.exports = {
    dataStore
}