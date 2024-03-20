const assert = require("assert");


class RequestParser {

    constructor(bufferCommands) {
        this.request = bufferCommands;
        this.cursor = 0;
        this.currentRequest = '';
    }

    setBufferCommands(bufferCommands) {
        this.request = bufferCommands;
    }

    static PartialRequestError = class PartialRequestError extends Error {
        constructor() {
            super('Index out of bound while parsing request');
            this.name = 'Partial Request';
        }
    };

    readString(lenOfString) {
        if (this.request.length < this.cursor + lenOfString) {
            throw new RequestParser.PartialRequestError();
        }
        let str = this.request.slice(this.cursor, this.cursor + lenOfString);
        this.cursor += lenOfString + 2;
        return str;
    }

    readBulkString() {
        assert.equal(this.curr(), '$', "start of an string should be with $")
        this.cursor++;
        let lenOfString = this.readNumberOfElements();
        let str = this.readString(lenOfString);
        return str;
    }

    readNumberOfElements() {
        let num = 0;
        while (this.curr() !== '\r') {
            num = (num * 10) + (this.curr() - '0');
            this.cursor++;
        }
        this.cursor += 2;
        return num;
    }


    parse() {
        let start = this.cursor;
        this.args = [];
        try {
            assert.equal(this.curr(), '*', "start of an array should be with *")
            this.cursor++;
            let arrayElements = this.readNumberOfElements();

            for (let i = 0; i < arrayElements; i++) {
                this.args.push(this.readBulkString())
            }
        } catch (E) {
            this.cursor = start;
            this.args = [];
            this.currentRequest = '';
        } finally {
            this.currentRequest = this.request.slice(start, this.cursor);
            return this.args;
        }
    }

    curr() {
        if (this.request.length <= this.cursor || this.cursor < 0) {
            throw new RequestParser.PartialRequestError();
        }
        return this.request[this.cursor];
    }

    getRemainingRequest() {
        return this.request.slice(this.cursor);
    }

    resetParser() {
        this.cursor = 0;
        this.args = [];
        this.currentRequest = '';

    }
}


module.exports = {
    RequestParser
}




const data = `*3\r\n$3\r\nset\r\n$3\r\nfoo\r\n$3\r\n123\r\n*3\r\n$3\r\nset\r\n$3\r\nbar\r\n$3\r\n456\r\n*3\r\n$3\r\nset\r\n$3\r\nbaz\r\n$3\r\n789\r\n`
const data2 = `*3\r\n$8\r\nREPLCONF\r\n$14\r\nlistening-port\r\n$4\r\n6380\r\n`
const data3 = `*1\r\n$4\r\nPING\r\n`
const data4 = `*3\r\n$5\r\nPSYNC\r\n$1\r\n?\r\n$2\r\n-1\r\n`
const data5 = `*3\r\n$8\r\nREPLCONF\r\n$4\r\ncapa\r\n$6\r\npsync2\r\n`
const data6 = `*2\r\n$4\r\ninfo\r\n$11\r\nreplication\r\n`
const data7 = `*2\r\n$3\r\nget\r\n$5\r\ngrape\r\n`
const data8 = `*5\r\n$3\r\nset\r\n$5\r\ngrape\r\n$6\r\nbanana\r\n$2\r\npx\r\n$3\r\n100\r\n`

const parser = new RequestParser(data.toString());
let args = parser.parse();
console.log(args)
parser.resetParser();
parser.setBufferCommands(data2);
args = parser.parse();
console.log(args)
parser.resetParser();
parser.setBufferCommands(data3);
args = parser.parse();
console.log(args)
parser.resetParser();
parser.setBufferCommands(data4);
args = parser.parse();
console.log(args)
parser.resetParser();
parser.setBufferCommands(data5);
args = parser.parse();
console.log(args)
parser.resetParser();
parser.setBufferCommands(data6);
args = parser.parse();
console.log(args)
parser.resetParser();
parser.setBufferCommands(data7);
args = parser.parse();
console.log(args)
parser.resetParser();
parser.setBufferCommands(data8);
args = parser.parse();
console.log(args)
parser.resetParser();

