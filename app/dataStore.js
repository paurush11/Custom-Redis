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
        let newSequenceNumber = '0'
        let newMillisecondsTime = '1526919030474'
        if (stream_key === "*") {
            if (this.streamCursor === 0) {
                newSequenceNumber = '0'
                newMillisecondsTime = '1526919030474'
            } else {
                const [prevMillisecondsTime, prevSequenceNumber] = this.streamTimeStamps[this.streamCursor - 1].split("-");
                newSequenceNumber = '0'
                newMillisecondsTime = '1526919030474'
            }
        } else {
            const [millisecondsTime, sequenceNumber] = stream_key.split("-");

            if (sequenceNumber === '*') {
                if (this.streamCursor === 0) {
                    newSequenceNumber = millisecondsTime === '0' ? '1' : '0'
                    newMillisecondsTime = millisecondsTime
                } else {
                    const [prevMillisecondsTime, prevSequenceNumber] = this.streamTimeStamps[this.streamCursor - 1].split("-");
                    if (millisecondsTime < prevMillisecondsTime) {
                        return Encoder.generateStreamError(true);
                    } else if (prevMillisecondsTime === millisecondsTime) {
                        newSequenceNumber = (Number(prevSequenceNumber) + 1).toString();
                        newMillisecondsTime = millisecondsTime
                    } else {
                        newSequenceNumber = '0'
                        newMillisecondsTime = millisecondsTime
                    }
                }

            } else {
                newSequenceNumber = sequenceNumber
                newMillisecondsTime = millisecondsTime
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

            }


            this.streamTimeStamps.push([newMillisecondsTime, newSequenceNumber].join("-"));
            this.streamCursor += 1;
            console.log(value[key])
            this.map.set(key, value);
        }
    }

    has() {

    }
}

module.exports = {
    dataStore
}