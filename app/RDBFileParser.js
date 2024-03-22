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
    readOPcode() {
        const code = this.buffer[this.cursor];
        return code;
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

    readLength() {
        // Get 2 most significant bits
        // 00	The next 6 bits represent the length
        // 01	Read one additional byte. The combined 14 bits represent the length
        // 10	Discard the remaining 6 bits. The next 4 bytes from the stream represent the length
        // 11	The next object is encoded in a special format. The remaining 6 bits indicate the format. May be used to store numbers or Strings, see String Encoding

        const firstByte = this.buffer.readUInt8(this.cursor);
        this.cursor += 1;
        //0xC0 ---> 11000000 in Hex ---> Bitwise and clears all the bytes except the first one. Now since we get 2 bits we right shift all zeros thus we get >>6
        const type = (firstByte && 0xC0) >> 6

        switch (type) {
            case 0: // 00
                return firstByte & 0x3F; // Return the 6 least significant bits
            case 1: // 01
                const secondByte = this.buffer.readUInt8(this.cursor++);
                this.cursor += 1
                return ((firstByte & 0x3F) << 8) | secondByte; // Combine the next 8 bits with the 6 least significant bits
            case 2: // 10
                return this.buffer.readUInt32BE(this.cursor++); // Read the next 4 bytes
            case 3: // 11
                // This is a special encoding, handle according to the remaining 6 bits
                const specialType = firstByte & 0x3F;
                // Handling of special encoding will depend on the Redis RDB file version and format
                console.log(`Special format with type: ${specialType}`);
                // Specific handling here
                return specialType;
            default:
                break
        }

    }

    readString() {
        const length = this.readLength();
        const string = this.buffer.toString('binary', this.cursor, this.cursor + length)
        this.cursor += length;
        return string;
    }

    readDataBaseSelector() {
        const dbNumber = this.readLength();  // Read the database number
        console.log(`Database number: ${dbNumber}`);
    }

    readResizedb() {
        const hashtableSize = this.readLength();
        const expiresSize = this.readLength();
        console.log(`Hashtable size: ${hashtableSize}, Expires size: ${expiresSize}`);
    }
    parse() {
        /// Here after reading magic number and version

        while (this.cursor < this.buffer.length) {
            const opcode = this.readOPcode();
            this.cursor += 1;

            switch (opcode) {
                case 0xFA:
                    // Auxiliary field
                    // May contain arbitrary metadata such as Redis version, creation time, used memory
                    const keyLength = this.readLength();
                    const key = this.readString(keyLength);

                    const valueLength = this.readLength();
                    const value = this.readString(valueLength);

                    console.log(key, value)
                    break;
                case 0xFE:
                    this.readDatabaseSelector();
                    break;
                case 0xFB:
                    this.readResizedb();
                    break;
                case 0xFD:
                    break;
                case 0xFC:
                    break;
                case 0xFF:
                    break;
            }
        }


    }

    readKeyValuePair() {
        this.parse()


    }
}


module.exports = {
    RDBFileParser
}