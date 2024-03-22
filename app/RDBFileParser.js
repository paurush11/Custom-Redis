const fs = require('fs');
const { dataStore } = require('./dataStore');

class RDBFileParser {
    constructor(filePath) {
        this.filePath = filePath;
        this.cursor = 0;
        this.buffer = null;
        this.magicString = '';
        this.version = 0;
        this.auxData = {};
        this.readFile();
        this.dataStore = new dataStore();
    }
    readFile() {
        if (fs.existsSync(this.filePath)) {
            this.buffer = fs.readFileSync(this.filePath);
            this.parseHeader();
            this.parse();
        }
    }

    parseHeader() {
        if (this.cursor !== 0) {
            this.cursor = 0;
        }
        if (!this.buffer) {
            return;
        }
        const magicString = this.buffer.toString('utf-8', this.cursor, this.cursor + 5);
        this.cursor += 5
        const version = parseInt(this.buffer.toString('utf-8', this.cursor, this.cursor + 4), 10);
        this.cursor += 4

        this.magicString = magicString;
        this.version = version;
    }

    readCurrByte() {
        return this.buffer[this.cursor++];
    }

    read2Bytes() {
        const value = this.buffer.readInt16LE(this.cursor);
        this.cursor += 2;
        return value
    }
    read4Bytes() {
        const value = this.buffer.readInt32LE(this.cursor);
        this.cursor += 4;
        return value
    }
    read8Bytes() {
        const value = this.buffer.readInt64LE(this.cursor);
        this.cursor += 8;
        return value
    }

    readOPcode() {
        const code = this.readCurrByte();
        return code;
    }

    readStringOfLen(len) {
        let string = String.fromCharCode(...(this.buffer.subarray(this.cursor, this.cursor + len)));
        this.cursor += len;
        return string;
    }
    readStringEncoding() {
        let { type, value } = this.readLengthEncoding();
        if (type === 'length') {
            let length = value;
            return this.readStringOfLen(length);
        }
        if (value === 0) {
            return `${this.readByte()}`;
        }
        else if (value === 1) {
            return `${this.read2Bytes()}`;
        }
        else if (value === 2) {
            return `${this.read4Bytes()}`;
        }
    }

    readValueType() {
        return this.readCurrByte();
    }

    readLengthEncoding() {
        let firstByte = this.readCurrByte();
        firstByte = firstByte >> 6;

        let value = firstByte;
        let type = "length"
        switch (firstByte) {
            case 0b00:
                value = (firstByte & 0b00111111)
                break;
            case 0b01:
                let secondByte = this.readCurrByte();
                value = ((firstByte & 0b00111111) << 8) | secondByte;
                break;
            case 0b10:
                value = this.read4Bytes();
                break;
            case 0b11:
                type = 'format';
                value = firstByte & 0b00111111;
                break;
        }

        return { value, type }

    }

    readValue(valueType) {
        if (valueType == 0) {
            return this.readStringEncoding();
        }
        console.log(valueType)
        throw new Error(`Value Type not handled: ${valueType}`);
    }
    readAUX() {
        let key = this.readStringEncoding();
        let value = this.readStringEncoding();
        this.auxData[key] = value;
    }

    readResizeDB() {
        let hashTableSize = this.readLengthEncoding().value;
        let expireHashTableSize = this.readLengthEncoding().value;
    }

    readExpireTimeMS() {
        let timestamp = this.read8Bytes();
        let valueType = this.readValueType();
        let key = this.readStringEncoding();
        let value = this.readValue(valueType);

        this.dataStore.insertKeyWithTimeStamp(key, value, timestamp);
    }

    readExpireTime() {
        let timestamp = this.read4Bytes() * 1000;
        let valueType = this.readValueType();
        let key = this.readStringEncoding();
        let value = this.readValue(valueType);

        this.dataStore.insertKeyWithTimeStamp(key, value, timestamp);

    }

    readSelectDB() {
        let { type, value } = this.readLengthEncoding();
    }

    readEOF() {
        console.log(`Read EOF`);
    }

    readKeyWithoutExpiry(valueType) {
        let key = this.readStringEncoding();
        let value = this.readValue(valueType);
        this.dataStore.insert(key, value);
    }

    parse() {
        /// Here after reading magic number and version
        while (true) {
            const opcode = this.readCurrByte();
            switch (opcode) {
                case 0xFA:
                    this.readAUX();
                    break;
                case 0xFE:
                    this.readSelectDB();
                    break;
                case 0xFB:
                    this.readResizedb();
                    break;
                case 0xFD:
                    this.readExpireTime();
                    break;
                case 0xFC:
                    this.readExpireTimeMS();
                    break;
                case 0xFF:
                    this.readEOF();
                    return;
                default:
                    this.readKeyWithoutExpiry(opcode);
                    break;
            }
        }


    }
}


module.exports = {
    RDBFileParser
}