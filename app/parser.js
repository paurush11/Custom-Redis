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





class Parser {

    constructor() {
        this.pingCount = 0;
        this.savedDict = {}
        this.mappedValues = {}
    }

    setData(data) {
        this.data = data;
        this.parseInput()
    }

    parseInput() {
        if (this.data[0] === "*") {
            const values = this.data.slice(1).split("\r\n");
            const length = values[0];
            for (let val = 1; val < length * 2; val += 4) {
                let command = values[val + 1].toUpperCase();
                let variableName = values[val + 3];
                switch (command) {
                    case "PING":
                        this.pingCount += 1;
                        break;
                    case "SET":
                        let variableValue = values[val + 5];
                        this.setValue(variableName.toLowerCase(), variableValue);
                        if (this.mappedValues[command]) {
                            this.mappedValues[command].push("OK");
                        } else {
                            this.mappedValues[command] = ["OK"];
                        }
                        val += 2;
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
    }
    setValue(key, value) {
        this.savedDict[key] = value;
    }
    getValue(key) {
        return this.savedDict[key];
    }
    encodeOutput(data) {
        return `$${data.length}\r\n${data}\r\n`;
    }

}


module.exports = {
    Parser
}


// const commamnd = "*3\r\n$3\r\nset\r\n$4\r\npear\r\n$9\r\nraspberry\r\n$2\r\npx\r\n"