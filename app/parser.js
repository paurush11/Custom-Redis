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
    setInfoData(master_replid, master_repl_offset) {
        this.master_replid = master_replid
        this.master_repl_offset = master_repl_offset
    }
    generateInfoString() {
        const bulkString = Object.entries(this.INFO).map(([key, value]) => `${key}:${value}`).join("\r\n");
        return bulkString;
    }
    setData(data) {
        this.data = data;
        this.parseInput()
    }

    saveInMappedValues(command, variableName) {
        if (this.mappedValues[command]) {
            this.mappedValues[command].push(variableName);
        } else {
            this.mappedValues[command] = [variableName];
        }
    }

    parseInput() {
        let arrayMessage = this.data.split("\r\n");
        let altered = false
        if (this.data[0] === '+') {

            if (arrayMessage.length > 6) {
                arrayMessage = arrayMessage.slice(7);
                arrayMessage.splice(0, 0, '*' + arrayMessage.length)
                console.log(arrayMessage)
                altered = true;
            }
        }
        if (this.data[0] === "*" || altered) {
            let arrayValues = arrayMessage;
            // arrayValues = arrayValues.slice(0, arrayValues.length - 1); //removing empty '';
            const arrayLength = Number(arrayValues[0].slice(1));
            let nextArrayIndex = arrayLength * 2 + 1;
            let currentIndex = 0;
            while (nextArrayIndex) {
                const valArray = arrayValues.slice(currentIndex, nextArrayIndex).filter((val, index) => !(index & 1));
                let command = valArray[1].toUpperCase();
                let variableName = valArray[2];
                switch (command) {
                    default:
                        break;
                    case "PING":
                        this.pingCount += 1;
                        break;
                    case 'ECHO':
                    case 'INFO':
                    case 'GET':
                        this.saveInMappedValues(command, variableName)
                        break;
                    case 'REPLCONF':
                        this.saveInMappedValues(command, 'OK')
                        break;
                    case 'PSYNC':
                        let master_replid = variableName;
                        let master_repl_offset = valArray[3];
                        this.setInfoData(master_replid, master_repl_offset)
                        this.saveInMappedValues(command, 'OK')
                        break;
                    case "SET":
                        let variableValue = valArray[3];
                        this.setValue(variableName.toLowerCase(), variableValue);
                        this.saveInMappedValues(command, 'OK')
                        let anotherCommand = valArray[4];
                        if (anotherCommand) {
                            if (anotherCommand.toLowerCase() === "px") {
                                const expiresIn = Number(valArray[5]);
                                setTimeout(() => {
                                    this.setValue(variableName.toLowerCase(), "ERROR");
                                }, expiresIn)
                            }
                        }
                        break;

                }
                // console.log(valArray);
                currentIndex = nextArrayIndex;
                if (arrayValues[nextArrayIndex] === '') break;
                nextArrayIndex = currentIndex + Number(arrayValues[nextArrayIndex].substr(1)) * 2 + 1;
                // nextArrayIndex = undefined;

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

    toString() {
        ///display all mapped Values 

        console.log("*************************")
        console.log("display all mapped Values")
        console.log(this.mappedValues)
        console.log("display ping count")
        console.log(this.pingCount)
        console.log("display savedValues")
        console.log(this.savedDict)
        console.log("*************************\n")
    }


}


module.exports = {
    Parser
}

// const data = `*3\r\n$3\r\nset\r\n$3\r\nfoo\r\n$3\r\n123\r\n*3\r\n$3\r\nset\r\n$3\r\nbar\r\n$3\r\n456\r\n*3\r\n$3\r\nset\r\n$3\r\nbaz\r\n$3\r\n789\r\n`
// const data2 = `*3\r\n$8\r\nREPLCONF\r\n$14\r\nlistening-port\r\n$4\r\n6380\r\n`
// const data3 = `*1\r\n$4\r\nPING\r\n`
// const data4 = `*3\r\n$5\r\nPSYNC\r\n$1\r\n?\r\n$2\r\n-1\r\n`
// const data5 = `*3\r\n$8\r\nREPLCONF\r\n$4\r\ncapa\r\n$6\r\npsync2\r\n`
// const data6 = `*2\r\n$4\r\ninfo\r\n$11\r\nreplication\r\n`
// const data7 = `*2\r\n$3\r\nget\r\n$5\r\ngrape\r\n`
// const data8 = `*5\r\n$3\r\nset\r\n$5\r\ngrape\r\n$6\r\nbanana\r\n$2\r\npx\r\n$3\r\n100\r\n`

// const port = 5555;
// const parser = new Parser(port, 'master');
// parser.setData(data);
// parser.toString()
// parser.resetParser()
// parser.setData(data2);
// parser.toString()
// parser.resetParser()
// parser.setData(data3);
// parser.toString()
// parser.resetParser()
// parser.setData(data4);
// parser.toString()
// parser.resetParser()
// parser.setData(data5);
// parser.toString()
// parser.resetParser()
// parser.setData(data6);
// parser.toString()
// parser.resetParser()
// parser.setData(data7);
// parser.toString()
// parser.resetParser()
// parser.setData(data8);
// parser.toString()
// parser.resetParser()
