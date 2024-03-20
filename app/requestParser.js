const assert = require("assert");


class RequestParser {

    constructor(bufferCommands) {
        this.request = bufferCommands;
        this.cursor = 0;
        this.currentRequest = '';
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
        this.cursor += 2;
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
            console.log(this.curr())
            num += num * 10 + (this.curr() - '0');
            /// 123 ->
            // num = 0*10 + 1-0 ;  num = 1
            // num = 1*10 + 2-0; num = 12
            // num = 12*10 + 3-0; num = 123
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
            this.currentRequest = this.request.slice(startCursor, this.cursor);
            return this.args;
        }
    }

    curr() {
        if (this.request.length < this.cursor || this.cursor < 0) {
            throw new RequestParser.PartialRequestError();
        }
        return this.request[this.cursor];
    }
}


module.exports = {
    RequestParser
}