const fs = require('fs')

class RDBFileParser {
    constructor(filePath) {
        this.filePath = filePath;
        this.keyValPair = {}
        this.cursor = 0
        this.buffer = null;
    }
    readFile() {
        this.buffer = fs.readFileSync(this.filePath);
    }
    parseHeader() {
        if (this.cursor !== 0) {
            this.cursor = 0;
        }
        const magicString = this.buffer.toString('utf-8', this.cursor, this.cursor + 5);
        const version = parseInt(this.buffer.toString('utf-8', this.cursor, this.cursor + 4), 10);

        return { magicString, version }

    }
    readKeyValuePair() {
        
    }
}


module.exports = {
    RDBFileParser
}