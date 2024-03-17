// TODO is create a protocol using REdis Serialization Protocol (RESP). 

// While RESP is technically non-TCP specific, the protocol is used exclusively with TCP connections (or equivalent stream-oriented connections like Unix sockets) in the context of Redis.

//  CR (\r), LF (\n) and SP ( ) have binary byte values of 13, 10 and 32, respectively.

/// Data Type can be  
// 1 - simple
// 2 - bulk
// 3 - aggregate

/// Simple String   ---> '+'
/// Simple Errors   ---> '-'
/// Simple Integers ---> ':'


// To be terminated with a CRLF (i.e., \r\n).

//eg -  send OK ---> +OK\r\n
//eg - error ---> -ErrorMsg\r\n

// Integer --->  :[<+|->]<value>\r\n  optional Plus and Minus followed by Value and end by \r\n ---> :0\r\n or :-1000\r\n


/// Bulk Strings -->  $<length>\r\n<data>\r\n  
// for eg ->  $5\r\nHello\r\n

//arrays --> *<No of elements>\r\n$<length>\r\n<data>




class Info {
    constructor(role) {
        this.master_replid = "8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb"
        this.master_repl_offset = 0;
        this.role = role;
    }

    generateString() {
        const master_replidValue = `master_replid:${this.master_replid}`
        const master_repl_offsetValue = `master_repl_offset:${this.master_repl_offset}`
        const roleValue = `role:${this.role}`

        return `$${roleValue.length}\r\n${roleValue}\r\n$${master_replidValue.length}\r\n${master_replidValue}\r\n$${master_repl_offsetValue.length}\r\n${master_repl_offsetValue}`

    }
}
class Parser {

    constructor(port, info) {
        this.pingCount = 0;
        this.savedDict = {}
        this.mappedValues = {}
        this.port = port;
        this.INFO = info
    }
    setData(data) {
        this.data = data;
        this.parseInput()
    }
    isErrorValue(data) {
        return data === "ERROR"
    }
    handleErrorValue() {
        return `$-1\r\n`;
    }

    parseInput() {
        if (this.data[0] === "*") {
            const values = this.data.slice(1).split("\r\n").filter((val, index) => !(index & 1));
            const length = values[0];
            for (let val = 1; val <= length; val += 2) {
                let command = values[val].toUpperCase();
                let variableName = values[val + 1];
                switch (command) {
                    case "PING":
                        this.pingCount += 1;
                        break;
                    case "SET":
                        let variableValue = values[val + 2];
                        this.setValue(variableName.toLowerCase(), variableValue);
                        if (this.mappedValues[command]) {
                            this.mappedValues[command].push("OK");
                        } else {
                            this.mappedValues[command] = ["OK"];
                        }
                        let anotherCommand = values[val + 3];
                        if (anotherCommand) {
                            if (anotherCommand.toLowerCase() === "px") {
                                const expiresIn = Number(values[val + 4]);
                                setTimeout(() => {
                                    this.setValue(variableName.toLowerCase(), "ERROR");
                                }, expiresIn)

                            }
                        }
                        val += 1;
                        break;

                    default:
                        if (this.mappedValues[command]) {
                            this.mappedValues[command].push(variableName);
                        } else {
                            this.mappedValues[command] = [variableName];
                        }
                        break;
                }
            }
        }
    }

    resetParser() {
        this.mappedValues = {}
        this.pingCount = 0;
        this.port = 0;
    }
    setValue(key, value) {
        this.savedDict[key] = value;
    }
    getValue(key) {
        return this.savedDict[key];
    }
    encodeOutput(data) {
        if (this.isErrorValue(data)) {
            return this.handleErrorValue();
        }
        return `$${data.length}\r\n${data}\r\n`;
    }

}


module.exports = {
    Parser,
    Info
}
