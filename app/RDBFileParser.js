const fs = require('fs');
const { dataStore } = require('./dataStore');
const { inspect } = require('util');

class RDBFileParser {
    constructor(filePath) {
        this.filePath = filePath;
        this.cursor = 0;
        this.buffer = null;
        this.magicString = '';
        this.version = 0;
        this.readFile();
        this.dataStore = new dataStore()
    }
    readFile() {
        if (fs.existsSync(this.filePath))
            this.buffer = fs.readFileSync(this.filePath);
        // else this.buffer = RDB_File_Binary
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
    readValueType() {
        const value = this.readByte();
        switch (value) {
            case 0:
                return "STRING"
            case 1:
                return "LIST";
        }
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
        throw new Error('Error while reading string encoding');
    }
    readLengthEncoding() {
        let firstByte = this.readByte();
        let value = firstByte;
        let type = "length"
        switch (firstByte >> 6) {
            case 0b00:
                value = (firstByte & 0b00111111)
                break;
            case 0b01:
                let secondByte = this.readByte();
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
    readStringOfLen(length) {
        const value = this.buffer.toString('utf-8', this.cursor, this.cursor + length);
        this.cursor += length;
        return value
    }
    readByte() {
        return this.buffer[this.cursor++];
    }
    read2Bytes() {
        const value = this.buffer.readInt16LE(this.cursor);
        this.cursor += 2;
        return value;
    }
    read4Bytes() {
        const value = this.buffer.readInt32LE(this.cursor);
        this.cursor += 4;
        return value;
    }
    read8Bytes() {
        const value = this.buffer.readBigUInt64LE(this.cursor);
        this.cursor += 8;
        return value;
    }

    readKeyWithExpireTime() {
        const fourByteInt = this.read4Bytes();
        const valueType = this.readValueType();
        if (valueType === "STRING") {
            const key = this.readStringEncoding();
            const value = this.readStringEncoding();
            console.log({ key, value })
        }

    }
    readKeyWithExpireTimeMS() {
        const eightByteInt = this.read8Bytes();
        console.log(eightByteInt);
        const valueType = this.readValueType();
        if (valueType === "STRING") {
            const key = this.readStringEncoding();
            const value = this.readStringEncoding();
            console.log({ key, value })
            this.dataStore.insertTimeStamp(key, value, eightByteInt);
        }
    }
    readResizedb() {
        const hashTableLength = this.readLengthEncoding();
        const expiredHashTableLength = this.readLengthEncoding();
        console.log('hashTableLength' + hashTableLength.value)
        console.log('expiredHashTableLength' + expiredHashTableLength.value)
        return
    }
    readAux() {
        const key = this.readStringEncoding();
        const value = this.readStringEncoding();
        console.log({ key, value })
    }
    readDatabaseSelector() {
        const databaseValue = this.readLengthEncoding();
        console.log('databaseValue' + databaseValue.value)
        return;
    }
    parse() {
        if (!this.buffer) return
        this.parseHeader();
        console.log(this.magicString)
        console.log(this.version)

        /// Here after reading magic number and version
        while (this.cursor < this.buffer.length) {
            const opcode = this.readByte()
            switch (opcode) {
                case 0xFA: //250
                    this.readAux();
                    break;
                case 0xFE://254
                    this.readDatabaseSelector();
                    break;
                case 0xFB://251
                    this.readResizedb();
                    break;
                case 0xFD://253
                    console.log("here")
                    this.readKeyWithExpireTime()
                    break;
                case 0xFC://252
                    console.log("here in ms")
                    this.readKeyWithExpireTimeMS()
                    break;
                case 0xFF://255
                    this.readEOF()
                    return;
                default:
                    this.readKeyWithoutExpiry();
            }
        }
        return
    }


    readEOF() {
        console.log(`Read EOF`);
    }

    readKeyWithoutExpiry() {
        const key = this.readStringEncoding();
        const value = this.readStringEncoding();
        console.log({ key, value })
        this.dataStore.insert(key, value);
    }
}


module.exports = {
    RDBFileParser
}

// const emptyRDBFileHex = "524544495330303033fa0972656469732d76657205372e322e30fa0a72656469732d62697473c040fe00fb010000056d616e676f09726173706265727279ff3859b950a54617570a"
// const RDB_File_Binary = Buffer.from(emptyRDBFileHex, "hex");


// const parser = new RDBFileParser('');
// parser.parse()