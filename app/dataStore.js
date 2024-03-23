const { Encoder } = require("./Utils/encoder");

class dataStore {
    constructor() {
        this.map = new Map();
        this.streamCursor = {};
        this.streamTimeStamps = {}; /// make it a map
    }

    allKeys() {
        return Array.from(this.map.keys());
    }

    insert(key, value) {
        this.map.set(key, value);
    }
    insertTimeStamp(key, value, time) {
        this.map.set(key, { value, timeStamp: time });
    }

    insertWithExp(key, value, expiration) {
        this.map.set(key, value);
        setTimeout(() => {
            this.map.delete(key);
        }, expiration)
    }

    get(key) {
        const value = this.map.get(key);

        if (value?.timeStamp) {
            if (Date.now() < value.timeStamp) {
                return value.value;
            } else {
                return "ERROR";
            }
        }

        return value;
    }

    type(key) {
        const value = this.map.get(key)
        if (!value) return "none";
        if (typeof value === "string")
            return "string"
        return "stream"
    }

    appendStreamValues(key, value) {
        const oldValues = this.map.get(key);
        if (!oldValues) {
            this.map.set(key, [value])
        } else {
            this.map.set(key, [...oldValues, value])
        }

    }

    getLastElementFromStream(key) {
        return this.streamTimeStamps[key][this.streamCursor[key] - 1].split("-")[0];
    }

    insertStream(key, value, stream_key) {
        let newSequenceNumber = '0'
        let newMillisecondsTime = '1526919030474'
        if (stream_key === "*") {
            const time = Date.now()
            if (this.streamCursor[key] === 0) {
                newSequenceNumber = '0'
                newMillisecondsTime = time.toString()
            } else {
                // const [prevMillisecondsTime, prevSequenceNumber] = this.streamTimeStamps[key][this.streamCursor - 1].split("-");
                newSequenceNumber = '0'
                newMillisecondsTime = time.toString()
            }
        } else {
            const [millisecondsTime, sequenceNumber] = stream_key.split("-");

            if (sequenceNumber === '*') {
                if (!this.streamCursor[key]) {
                    newSequenceNumber = millisecondsTime === '0' ? '1' : '0'
                    newMillisecondsTime = millisecondsTime
                } else {
                    const [prevMillisecondsTime, prevSequenceNumber] = this.streamTimeStamps[key][this.streamCursor[key] - 1].split("-");
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
                if (!this.streamCursor[key]) {
                    if (millisecondsTime === '0' && sequenceNumber === '0')
                        return Encoder.generateStreamError(false);
                } else {

                    const [prevMillisecondsTime, prevSequenceNumber] = this.streamTimeStamps[key][this.streamCursor[key] - 1].split("-");
                    if (millisecondsTime === '0' && sequenceNumber === '0')
                        return Encoder.generateStreamError(false);
                    if (millisecondsTime < prevMillisecondsTime || (prevMillisecondsTime === millisecondsTime && sequenceNumber <= prevSequenceNumber)) {
                        return Encoder.generateStreamError(true);
                    }
                }

            }


        }

        let new_stream_key = [newMillisecondsTime, newSequenceNumber].join("-")
        if (this.streamTimeStamps[key]) {
            this.streamTimeStamps[key].push(new_stream_key);
            this.streamCursor[key] += 1;
        } else {
            this.streamTimeStamps[key] = [new_stream_key];
            this.streamCursor[key] = 1;
        }
        // value[key] = new_stream_key
        /// append values form the stream;
        this.appendStreamValues(key, value);
        return Encoder.generateBulkString(new_stream_key);
    }

    pushAsArray(arrayObject, streamArrayValues, stream_key) {
        for (const [key, val] of Object.entries(arrayObject)) {
            if (key === stream_key) continue;
            streamArrayValues.push([key, val]);
        }
        return streamArrayValues;
    }

    getXStreamValues(key, start) {
        let startTime = '0'
        let startSequence
        if (start !== "-") {
            [startTime, startSequence] = start.split("-");
        }
        if (!startSequence) {
            startSequence = '0'
        }

        let stream = this.map.get(key);
        let streamArrayValues = [];
        let streamArrayValuesParent = [key];
        stream.forEach((arrayValue) => {
            if (arrayValue[key]) {
                const [currTime, currSequence] = arrayValue[key].split("-");
                let arrayKey = [arrayValue[key]]
                if (Number(currTime) >= Number(startTime) && Number(currSequence) >= Number(startSequence)) {
                    arrayKey = this.pushAsArray(arrayValue, arrayKey, key);
                    streamArrayValues.push(arrayKey);
                }
            }
        })

        streamArrayValuesParent.push(streamArrayValues);
        return [streamArrayValuesParent];

    }

    getStreamValues(key, start, end) {
        let startTime = '0'
        let endTime = 'max'
        let startSequence
        let endSequence
        if (start !== "-") {
            [startTime, startSequence] = start.split("-");
        }
        if (end !== "+") {
            [endTime, endSequence] = end.split("-");
        }

        if (!startSequence) {
            startSequence = '0'
        }
        if (!endSequence) {
            endSequence = 'max'
        }
        let stream = this.map.get(key);
        let streamArrayValues = [];
        stream.forEach((arrayValue) => {
            if (arrayValue[key]) {
                const [currTime, currSequence] = arrayValue[key].split("-");
                let arrayKey = [arrayValue[key]]

                if (Number(currTime) >= Number(startTime) && (endTime === "max" || Number(currTime) <= Number(endTime)) && Number(currSequence) >= Number(startSequence) && (endSequence === "max" || Number(currSequence) <= Number(endSequence))) {
                    arrayKey = this.pushAsArray(arrayValue, arrayKey, key);
                    streamArrayValues.push(arrayKey);
                }
            }
        })
        return Encoder.generateBulkArray(streamArrayValues);
    }

    has() {

    }
}

module.exports = {
    dataStore
}