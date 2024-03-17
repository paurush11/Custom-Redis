const net = require("net");
const { Parser, Info } = require("./parser");

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
        const finalString = parser.generateInfoString()
        console.log(finalString)
        switch (role) {
            case 'master':
                connection.write(finalString);
                break;
            case 'slave':
                connection.write(finalString);

                break;
        }
        // console.log(`$${5 + role.length}\r\nrole:${role}\r\n`)

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


    console.log(masterSlavePorts)
    parser.resetParser();
}

const handleHandshake = (parser, connection) => {
    const role = masterSlavePorts.has(parser.port) ? 'slave' : 'master';
    console.log(role)

    if (role === "slave") {
        connection.write(`*1\r\n$4\r\nping\r\n`)
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
            const masterSlaveConnection = net.createConnection({ host: args[masterHostIndex], port: args[masterPortIndex] }, () => {
                masterSlaveConnection.write(`*1\r\n$4\r\nping\r\n`)
            })
        }
    }
}


// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");



const server = net.createServer((connection) => {
    const clientId = `${connection.remoteAddress}:${connection.remotePort}`;
    const role = masterSlavePorts.has(port) ? 'slave' : 'master';
    const info = {
        role: role,
        master_replid: "8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb",
        master_repl_offset: 0
    }
    if (!clientParsers.has(clientId)) {
        clientParsers.set(clientId, new Parser(port, info));
    }
    const parser = clientParsers.get(clientId);
    handleHandshake(parser, connection);
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
