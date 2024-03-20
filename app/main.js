// const net = require("net");
// const { Parser, Info } = require("./parser");
// const { encodeOutput, encodeArrayOutput, handleOkValue } = require("./Utils/sendMessages");

const { MasterServer } = require("./masterServer");
const { SlaveServer } = require("./slaveServer");

// const clientParsers = new Map();
// const masterSlavePorts = new Map();
// const emptyRDBFileHex = "524544495330303131fa0972656469732d76657205372e322e30fa0a72656469732d62697473c040fa056374696d65c26d08bc65fa08757365642d6d656dc2b0c41000fa08616f662d62617365c000fff06e3bfec0ff5aa2"
// const replicaList = [];
// let activeWaits = [];
// let ackCounter = 0;

// const handlePing = (parser, connection) => {
//     for (let i = 0; i < parser.pingCount; i++) {
//         connection.write(`+PONG\r\n`)
//     }
// }
// const handleEchoCommand = (parser, connection) => {
//     if (parser.mappedValues["ECHO"]) {
//         for (let i = 0; i < parser.mappedValues["ECHO"].length; i++) {
//             connection.write(encodeOutput(parser.mappedValues["ECHO"][i]))
//         }
//     }
// }

// const handleWaitCommand = (parser, connection) => {
//     if (parser.mappedValues["WAIT"]) {
//         for (let i = 0; i < parser.mappedValues["WAIT"].length; i++) {
//             const [replicaNumber, timeout] = parser.mappedValues["WAIT"][i].split(":").map(Number);
//             let wait = {
//                 noOfAckReplies: ackCounter,
//                 noOfReqReplies: replicaNumber,
//                 connection: connection,
//             };
//             //write to all replicas to req ack
//             for (const [replica] of replicaList) {
//                 replica.write(encodeArrayOutput(["REPLCONF", "GETACK", "*"]));
//                 replica.write(encodeArrayOutput(["PING"]));
//             }

//             activeWaits.push(wait);
//             if (ackCounter >= replicaNumber) {
//                 console.log("true")
//                 respondToWait(wait, true);
//             } else {
//                 console.log("false")
//                 // Set a timeout to handle the wait expiration
//                 setTimeout(() => {
//                     respondToWait(wait, false);
//                 }, timeout);
//             }
//         }
//     }
// };


// const respondToWait = (wait, immediate) => {
//     console.log("respondToWait")
//     if (immediate) {
//         wait.connection.write(`:${wait.noOfReqReplies}\r\n`);
//     } else {
//         wait.connection.write(`:${wait.noOfAckReplies}\r\n`);
//     }

//     activeWaits = activeWaits.filter(w => w !== wait);

// }
// const acknowledgeFromReplica = () => {
//     ackCounter++;

//     activeWaits.forEach(wait => {
//         if (ackCounter >= wait.noOfReqReplies && !wait.responded) {
//             respondToWait(wait, true);
//             wait.responded = true;  // Mark as responded to avoid duplicate responses
//         }
//     });
// };

// const handleSetCommand = (parser, connection, data) => {
//     if (parser.mappedValues["SET"]) {
//         for (let i = 0; i < parser.mappedValues["SET"].length; i++) {
//             connection.write(`+OK\r\n`)
//         }
//         sendReplicaCommands(parser, data);
//     }
// }
// const handleREPLCONFCommand = (parser, connection) => {
//     if (parser.mappedValues["REPLCONF"]) {
//         for (let i = 0; i < parser.mappedValues["REPLCONF"].length; i++) {
//             if (parser.mappedValues["REPLCONF"][i] === 'OK') {
//                 connection.write(handleOkValue());
//             }
//         }
//     }
// }
// const sendRDBFile = (connection) => {
//     const RDB_File_Binary = Buffer.from(emptyRDBFileHex, "hex");
//     connection.write(Buffer.concat([Buffer.from(`$${RDB_File_Binary.length}\r\n`), RDB_File_Binary]))
// }
// const sendReplicaCommands = (parser, data) => {
//     if (replicaList.length == 0) return;
//     for (const [replica] of replicaList) {
//         replica.write(data);
//     }
// }
// const handlePSYNCCommand = (parser, connection) => {
//     if (parser.mappedValues["PSYNC"]) {
//         connection.write(`+FULLRESYNC ${parser.INFO.master_replid} ${0}\r\n`)
//         sendRDBFile(connection)
//         replicaList.push([connection, parser.port]);
//     }
// }
// const handleInfoCommand = (parser, connection) => {
//     if (parser.mappedValues["INFO"]) {
//         const role = masterSlavePorts.has(parser.port) ? 'slave' : 'master';
//         const finalString = parser.generateInfoString()
//         switch (role) {
//             case 'master':
//                 connection.write(encodeOutput(finalString));
//                 break;
//             case 'slave':
//                 connection.write(encodeOutput(finalString));
//                 break;
//         }
//     }
// }

// const handleGetCommand = (parser, connection) => {
//     if (parser.mappedValues["GET"]) {
//         for (let i = 0; i < parser.mappedValues["GET"].length; i++) {
//             const val = parser.getValue(parser.mappedValues["GET"][i]);
//             if (!val) connection.write(`$-1\r\n`)
//             connection.write(encodeOutput(val))
//         }
//     }
// }

// const handleParserCommands = (data, parser, connection) => {
//     parser.setData(data.toString());
//     handlePing(parser, connection);
//     handleEchoCommand(parser, connection);
//     handleSetCommand(parser, connection, data);
//     handleREPLCONFCommand(parser, connection);
//     handleGetCommand(parser, connection);
//     handleInfoCommand(parser, connection);
//     handlePSYNCCommand(parser, connection);
//     handleWaitCommand(parser, connection);

// }
// const handleSlaveServerAck = (replicaParser, slaveSlaveConnection) => {
//     console.log("Iam here")
//     if (replicaParser.mappedValues["REPLCONF"]) {
//         slaveSlaveConnection.write(replicaParser.mappedValues["REPLCONF"]);

//         acknowledgeFromReplica()
//     }
// }
// const handleHandshake = () => {
//     const role = masterSlavePorts.has(port) ? 'slave' : 'master';

//     if (role === "slave") {
//         console.log("STARTING SLAVE SERVER")
//         const [masterHost, masterPort] = masterSlavePorts.get(port).split(":")
//         const slaveSlaveConnection = net.createConnection({ host: masterHost, port: masterPort }, () => {
//             slaveSlaveConnection.write(encodeArrayOutput(['ping']))
//             slaveSlaveConnection.write(encodeArrayOutput(['REPLCONF', 'listening-port', port.toString()]))
//             slaveSlaveConnection.write(encodeArrayOutput(['REPLCONF', 'capa', 'psync2']))
//             slaveSlaveConnection.write(encodeArrayOutput(['PSYNC', '?', '-1']))
//             slaveSlaveConnection.on('data', (data) => {
//                 const replicaClientId = createClientId(slaveSlaveConnection);
//                 if (!clientParsers.has(replicaClientId)) {
//                     clientParsers.set(replicaClientId, new Parser(port, role));
//                 }
//                 const replicaParser = clientParsers.get(replicaClientId);
//                 replicaParser.setData(data.toString());
//                 handleSlaveServerAck(replicaParser, slaveSlaveConnection);
//             })
//         })

//     }

// }



// let port = 6379;
// const getCommandLineArgs = () => {
//     const args = process.argv.slice(2);
//     if (args.length === 0) {
//         port = 6379;
//     } else {
//         if (args.includes("--port")) {
//             const i = args.indexOf("--port") + 1;
//             port = Number(args[i]);
//         }
//         if (args.includes("--replicaof")) {
//             const masterHostIndex = args.indexOf("--replicaof") + 1;
//             const masterPortIndex = args.indexOf("--replicaof") + 2;
//             masterSlavePorts.set(port, args[masterHostIndex] + ":" + args[masterPortIndex])

//         }
//     }
//     handleHandshake()
//     server.listen(port, "127.0.0.1");
// }

// const createClientId = (connection) => {
//     const clientId = `${connection.remoteAddress}:${connection.remotePort}`;
//     return clientId;
// }


// // You can use print statements as follows for debugging, they'll be visible when running tests.
// console.log("Logs from your program will appear here!");


// const server = net.createServer((connection) => {
//     console.log("STARTING MASTER SERVER")
//     const clientId = createClientId(connection);
//     const role = masterSlavePorts.has(port) ? 'slave' : 'master';
//     if (!clientParsers.has(clientId)) {
//         clientParsers.set(clientId, new Parser(port, role));
//     }
//     const parser = clientParsers.get(clientId);

//     connection.on('data', data => {
//         handleParserCommands(data, parser, connection);
//         console.log(data.toString())
//         parser.resetParser();
//     })

//     connection.on('close', () => {
//         clientParsers.delete(clientId);
//     });


// })

// getCommandLineArgs();





const HOST = 'localhost';
const PORT = '6379';

const func = (args) => {

    if (args.length === 0) {
        let server = new MasterServer(HOST, PORT)
        server.startServer();
    } else if (args.length === 2) {
        const [portFlag, port] = args;
        let server = new MasterServer(HOST, port)
        server.startServer();
    } else if (args.length === 5) {
        const [portFlag, port, replicaFlag, masterHost, masterPort] = args;
        let server = new SlaveServer(HOST, port)

    }
}

func(process.argv.slice(2));
