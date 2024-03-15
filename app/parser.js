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

const handleCommand = (mappedValues) => {

}

const parseInput = (data, mappedValues) => {
    if (data[0] === "*") {
        const values = data.slice(1).split("\r\n");
        const length = values[0];
        for (let val = 1; val < length * 2; val += 4) {
            let command = values[val + 1];
            let variableName = values[val + 3];

            if (mappedValues[command.toUpperCase()]) {
                mappedValues[command.toUpperCase()].push(variableName);
            } else {
                mappedValues[command.toUpperCase()] = [variableName];
            }
        }
    }
    return mappedValues;
}

const encodeOutput = (data) => {
    return `$${data.length}\r\n${data}\r\n`;

}




class Parser {
    constructor(data) {
        this.data = data;
        this.setValues = {}
        this.mappedValues = {}
    }

    parseInput() {
        if (data[0] === "*") {
            const values = data.slice(1).split("\r\n");
            const length = values[0];
            for (let val = 1; val < length * 2; val += 4) {
                let command = values[val + 1];
                let variableName = values[val + 3];
                if (command === "SET") {
                    let variableValue = values[val + 5];
                    this.setValue(variableName.toLowerCase(), variableValue);
                    val+=2;
                } else {
                    if (this.mappedValues[command.toUpperCase()]) {
                        this.mappedValues[command.toUpperCase()].push(variableName);
                    } else {
                        this.mappedValues[command.toUpperCase()] = [variableName];
                    }
                }

            }
        }
    }
    setValue (key, value) {
        this.setValues[key] = value;
    }
    getValue (key) {
        return this.setValues[key];
    }

    encodeOutput() {
        return `$${data.length}\r\n${data}\r\n`;

    }

}

module.exports = {
    Parser
}