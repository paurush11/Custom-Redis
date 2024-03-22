const fs = require('fs')

class RDBFileParser {
    constructor(filePath) {
        this.filePath = filePath;
        this.keyValPair = {}
        this.cursor = 0
        this.buffer = null;
        this.readFile();
        this.magicString = ''
        this.version = 0
    }
    readFile() {
        if (fs.existsSync(this.filePath))
            this.buffer = fs.readFileSync(this.filePath);
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
    readKeyValuePair() {
        console.log(this.cursor)
        const data = this.buffer.toString('utf-8', this.cursor, this.cursor + 1);
        console.log(data);


    }
}


module.exports = {
    RDBFileParser
}