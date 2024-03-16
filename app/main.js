const net = require("net");
const { Parser } = require("./parser");

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
            connection.write(parser.encodeOutput(parser.mappedValues["ECHO"][i]))
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
        connection.write(`$${11}\r\nrole:${role}\r\n`);
    }
}

const handleGetCommand = (parser, connection) => {
    if (parser.mappedValues["GET"]) {
        for (let i = 0; i < parser.mappedValues["GET"].length; i++) {
            const val = parser.getValue(parser.mappedValues["GET"][i]);
            if (!val) connection.write(`$-1\r\n`)
            connection.write(parser.encodeOutput(val))
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

    if (!clientParsers.has(clientId)) {
        clientParsers.set(clientId, new Parser(port));
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
server.listen(port, "127.0.0.1");
