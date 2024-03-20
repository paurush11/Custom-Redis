class RequestParser {

    constructor(bufferCommands) {
        this.request = bufferCommands;
        this.cursor = 0;
        this.currentRequest = '';
    }

    readString() {

    }

    readBulkString() {

    }

    readNumber() {

    }

    parse() {
        let start = this.cursor;
        this.args = [];
        

    }
}


module.exports = {
    RequestParser
}