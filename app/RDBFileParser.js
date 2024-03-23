const fs = require('fs');
const { dataStore } = require('./dataStore');

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





    OPCodes = {
        AUX: 0xFA,
        RESIZEDB: 0xFB,
        EXPIRETIMEMS: 0xFC,
        EXPIRETIME: 0xFD,
        SELECTDB: 0xFE,
        EOF: 0xFF
    }

    readKeyWithExpireTime() {

    }
    readKeyWithExpireTimeMS() {

    }
    readResizedb() {

    }
    readAux() {

    }
    parse() {
        console.log(JSON.stringify(this.buffer))
        this.parseHeader();
        /// Here after reading magic number and version

        while (this.cursor < this.buffer.length) {
            const opcode = this.readOPcode();
            switch (opcode) {
                case 0xFA:
                    this.readAux();
                    break;
                case 0xFE:
                    this.readDatabaseSelector();
                    break;
                case 0xFB:
                    this.readResizedb();
                    break;
                case 0xFD:
                    this.readKeyWithExpireTime()
                    break;
                case 0xFC:
                    this.readKeyWithExpireTimeMS()
                    break;
                case 0xFF:
                    this.readEOF()
                    break;
                default:
                    this.readKeyWithoutExpiry();
            }
        }
        return
    }


    readEOF() {
        console.log(`Read EOF`);
    }

    readKeyWithoutExpiry(valueType) {
        // let key = this.readStringEncoding();
        // let value = this.readValue(valueType);
        // this.dataStore.insert(key, value);
    }
}


module.exports = {
    RDBFileParser
}

const emptyRDBFileHex = "524544495330303131fa0972656469732d76657205372e322e30fa0a72656469732d62697473c040fa056374696d65c26d08bc65fa08757365642d6d656dc2b0c41000fa08616f662d62617365c000fff06e3bfec0ff5aa2"
const RDB_File_Binary = Buffer.from(emptyRDBFileHex, "hex");


// const parser = new RDBFileParser('');
// parser.parse()