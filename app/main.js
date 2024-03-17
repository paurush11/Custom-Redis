const net = require("net");
const { Parser, Info } = require("./parser");
const { encodeOutput, encodeArrayOutput } = require("./Utils/sendMessages");

const clientParsers = new Map();
const masterSlavePorts = new Map();

const handlePing = (parser, connection) => {
    for (let i = 0; i < parser.pingCount; i++) {
        connection.write(`+PONG\r\n`)
    }
}
const handleEchoCommand = (parser, connection) => {
    if (parser.mappedValues["ECHO"]) {
        for (let i = 0; i < parser.mappedValues["ECHO"].length; i++) {
            connection.write(encodeOutput(parser.mappedValues["ECHO"][i]))
        }
    }
}
const handleSetCommand = (parser, connection) => {
    if (parser.mappedValues["SET"]) {
        for (let i = 0; i < parser.mappedValues["SET"].length; i++) {
            connection.write(`+OK\r\n`)
        }
    }
}
const handleInfoCommand = (parser, connection) => {
    if (parser.mappedValues["INFO"]) {
        const role = masterSlavePorts.has(parser.port) ? 'slave' : 'master';
        const finalString = parser.generateInfoString()
        switch (role) {
            case 'master':
                connection.write(encodeOutput(finalString));
                break;
            case 'slave':
                connection.write(encodeOutput(finalString));
                break;
        }
    }
}

const handleGetCommand = (parser, connection) => {
    if (parser.mappedValues["GET"]) {
        for (let i = 0; i < parser.mappedValues["GET"].length; i++) {
            const val = parser.getValue(parser.mappedValues["GET"][i]);
            if (!val) connection.write(`$-1\r\n`)
            connection.write(encodeOutput(val))
        }
    }
}

const handleParserCommands = (data, parser, connection) => {
    parser.setData(data.toString());
    handlePing(parser, connection);
    handleEchoCommand(parser, connection);
    handleSetCommand(parser, connection);
    handleGetCommand(parser, connection);
    handleInfoCommand(parser, connection);
    parser.resetParser();
}

const handleHandshake = () => {
    const role = masterSlavePorts.has(port) ? 'slave' : 'master';
    if (role === "slave") {
        const [masterHost, masterPort] = masterSlavePorts.get(port).split(":")
        const masterSlaveConnection = net.createConnection({ host: masterHost, port: masterPort }, () => {
            // masterSlaveConnection.write(`*1\r\n$4\r\nping\r\n`)
            masterSlaveConnection.write(encodeArrayOutput['ping'].toString())
            // masterSlaveConnection.write(encodeArrayOutput['REPLCONF', 'listening-port', port.toString()])
            // masterSlaveConnection.write(encodeArrayOutput['REPLCONF', 'capa', 'psync2'])
        })
    }

}

let port = 6379;
const getCommandLineArgs = () => {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        port = 6379;
    } else {
        if (args.includes("--port")) {
            const i = args.indexOf("--port") + 1;
            port = Number(args[i]);
        }
        if (args.includes("--replicaof")) {
            const masterHostIndex = args.indexOf("--replicaof") + 1;
            const masterPortIndex = args.indexOf("--replicaof") + 2;
            masterSlavePorts.set(port, args[masterHostIndex] + ":" + args[masterPortIndex])

        }
    }
}



// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");


const server = net.createServer((connection) => {
    const clientId = `${connection.remoteAddress}:${connection.remotePort}`;
    const role = masterSlavePorts.has(port) ? 'slave' : 'master';
    if (!clientParsers.has(clientId)) {
        clientParsers.set(clientId, new Parser(port, role));
    }
    const parser = clientParsers.get(clientId);

    connection.on('data', data => {
        handleParserCommands(data, parser, connection);
    })
    connection.on('close', () => {
        // Remove the parser when the client disconnects
        clientParsers.delete(clientId);
    });

})
getCommandLineArgs()
handleHandshake()
server.listen(port, "127.0.0.1");
