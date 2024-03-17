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

    constructor(port, role) {
        this.pingCount = 0;
        this.savedDict = {}
        this.mappedValues = {}
        this.port = port;
        this.INFO = {
            role: role,
            master_replid: "8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb",
            master_repl_offset: 0
        }
    }
    generateInfoString() {
        const bulkString = Object.entries(this.INFO).map(([key, value]) => `${key}:${value}`).join("\r\n");
        return bulkString;
    }
    setData(data) {
        this.data = data;
        this.parseInput()
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
                    case 'ECHO':
                    case 'INFO':
                        if (this.mappedValues[command]) {
                            this.mappedValues[command].push(variableName);
                        } else {
                            this.mappedValues[command] = [variableName];
                        }
                        break;
                    case 'GET':
                        if (this.mappedValues[command]) {
                            this.mappedValues[command].push(variableName);
                        } else {
                            this.mappedValues[command] = [variableName];
                        }
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
                    case 'REPLCONF':
                        if (this.mappedValues[command]) {
                            this.mappedValues[command].push("OK");
                        } else {
                            this.mappedValues[command] = ["OK"];
                        }
                        break;
                    case 'PSYNC':
                        let master_replid = variableName;
                        let master_repl_offset = values[val + 2];
                        if (this.mappedValues[command]) {
                            this.mappedValues[command].push(["FULLRESYNC", "8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb",'0']);
                        } else {
                            this.mappedValues[command] = [[["FULLRESYNC", "8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb",'0']]];
                        }
                        break;


                    default:
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


}


module.exports = {
    Parser
}
