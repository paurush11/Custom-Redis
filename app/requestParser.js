const assert = require("assert");


class RequestParser {

    constructor(bufferCommands) {
        this.request = bufferCommands;
        this.cursor = 0;
        this.currentRequest = '';
    }

    readString() {

    }

    readBulkString() {
        assert.equal(this.curr(), '$', "start of an string should be with $")

    }

    readNumber() {
        let num = 0;
        while (this.curr() !== '\r') {
            console.log(this.curr())
            this.cursor++;
        }
        this.cursor+=2;
    }


    parse() {
        let start = this.cursor;
        this.args = [];
        try {
            assert.equal(this.curr(), '*', "start of an array should be with *")
            this.cursor++;

        } catch (E) {
            this.cursor = start;
            this.args = [];
            this.currentRequest = '';
        } finally {

            return this.args;
        }
    }

    curr() {
        return this.request[this.cursor];
    }
}


module.exports = {
    RequestParser
}