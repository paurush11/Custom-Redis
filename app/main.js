const net = require("net");
const { Parser, Info } = require("./parser");
const { encodeOutput, encodeArrayOutput } = require("./Utils/sendMessages");

const clientParsers = new Map();
const masterSlavePorts = new Map();
const emptyRDBFileHex = "524544495330303131fa0972656469732d76657205372e322e30fa0a72656469732d62697473c040fa056374696d65c26d08bc65fa08757365642d6d656dc2b0c41000fa08616f662d62617365c000fff06e3bfec0ff5aa2"
const replicaList = [];
const replicaPorts = {};
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
const handleSetCommand = (parser, connection, data) => {
    if (parser.mappedValues["SET"]) {
        for (let i = 0; i < parser.mappedValues["SET"].length; i++) {
            connection.write(`+OK\r\n`)
        }
        sendReplicaCommands(parser, data);
    }
}
const handleREPLCONFCommand = (parser, connection) => {
    if (parser.mappedValues["REPLCONF"]) {
        for (let i = 0; i < parser.mappedValues["REPLCONF"].length; i++) {
            connection.write(`+OK\r\n`)
        }
    }
}
const sendRDBFile = (connection) => {
    const RDB_File_Binary = Buffer.from(emptyRDBFileHex, "hex");
    connection.write(Buffer.concat([Buffer.from(`$${RDB_File_Binary.length}\r\n`), RDB_File_Binary]))
}
const sendReplicaCommands = (parser, data) => {
    if (parser.INFO.role !== 'master' || replicaList.length == 0) return;
    for (const replica of replicaList) {
        replica.write(data);
        const replicaClientId = createClientId(replica);
        if (!clientParsers.has(replicaClientId)) {
            clientParsers.set(replicaClientId, new Parser(port, role));
        }
    }
}
const handlePSYNCCommand = (parser, connection) => {
    if (parser.mappedValues["PSYNC"]) {
        connection.write(`+FULLRESYNC ${parser.INFO.master_replid} ${parser.INFO.master_repl_offset}\r\n`)
        sendRDBFile(connection)
        replicaList.push(connection);
        console.log(parser.mappedValues);

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
    handleSetCommand(parser, connection, data);
    handleREPLCONFCommand(parser, connection);
    handleGetCommand(parser, connection);
    handleInfoCommand(parser, connection);
    handlePSYNCCommand(parser, connection);
    parser.resetParser();
}

const handleHandshake = () => {
    const role = masterSlavePorts.has(port) ? 'slave' : 'master';
    if (role === "slave") {
        const [masterHost, masterPort] = masterSlavePorts.get(port).split(":")
        const masterSlaveConnection = net.createConnection({ host: masterHost, port: masterPort }, () => {
            masterSlaveConnection.write(encodeArrayOutput(['ping']))
            masterSlaveConnection.write(encodeArrayOutput(['REPLCONF', 'listening-port', port.toString()]))
            masterSlaveConnection.write(encodeArrayOutput(['REPLCONF', 'capa', 'psync2']))
            masterSlaveConnection.write(encodeArrayOutput(['PSYNC', '?', '-1']))
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
            console.log(port)
        }
        if (args.includes("--replicaof")) {
            const masterHostIndex = args.indexOf("--replicaof") + 1;
            const masterPortIndex = args.indexOf("--replicaof") + 2;
            masterSlavePorts.set(port, args[masterHostIndex] + ":" + args[masterPortIndex])

        }
    }
    handleHandshake()
    server.listen(port, "127.0.0.1");
}

const createClientId = (connection) => {
    const clientId = `${connection.remoteAddress}:${connection.remotePort}`;
    return clientId;
}


// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");


const server = net.createServer((connection) => {
    const clientId = createClientId(connection);
    const role = masterSlavePorts.has(port) ? 'slave' : 'master';
    if (!clientParsers.has(clientId)) {
        clientParsers.set(clientId, new Parser(port, role));
    }
    const parser = clientParsers.get(clientId);
    console.log(parser.port)
    connection.on('data', data => {
        handleParserCommands(data, parser, connection);


    })
    connection.on('close', () => {
        clientParsers.delete(clientId);
    });

})

getCommandLineArgs();


