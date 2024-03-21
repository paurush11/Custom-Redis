const net = require("net");
const { dataStore } = require("./dataStore");
const { createUid } = require("./Utils/sendMessages");
const { RequestParser } = require("./requestParser");
const { Encoder } = require("./Utils/encoder");
const emptyRDBFileHex = "524544495330303131fa0972656469732d76657205372e322e30fa0a72656469732d62697473c040fa056374696d65c26d08bc65fa08757365642d6d656dc2b0c41000fa08616f662d62617365c000fff06e3bfec0ff5aa2"

class MasterServer {
    constructor(host, port) {
        this.port = port;
        this.host = host;
        this.dataStore = new dataStore()
        this.clientCommands = {}
        this.masterReplId = '8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb';
        this.masterReplOffset = 0;
        this.replicas = {}
    }

    startServer() {

        const server = net.createServer((socket) => {
            this.clientCommands[createUid(socket)] = '';

            socket.on('data', (data) => {
                this.clientCommands[createUid(socket)] += data.toString();
                this.processClientCommands(socket);
            })

            socket.on('error', (err) => {
                console.log(`Socket Error: ${err}`);
                delete this.clientCommands[createUid(socket)];
            })

            socket.on('close', () => {
                console.log(`Closing Socket : ${createUid(socket)}`);
                delete this.clientCommands[createUid(socket)];
            })
        })

        server.listen(this.port, this.host, () => {
            console.log(`Master Server Listening on ${this.host}:${this.port}`);
        });

    }


    processClientCommands(socket) {
        const clientKey = createUid(socket);
        const clientCommands = this.clientCommands[clientKey];
        let requestParser = new RequestParser(clientCommands);
        while (true) {
            let args = requestParser.parse();
            if (args.length === 0) break;
            let currentRequest = requestParser.currentRequest;
            this.handleCommands(args, socket, currentRequest)
        }
        this.clientCommands[clientKey] = requestParser.getRemainingRequest()
    }

    handleCommands(args, socket, currentRequest) {
        let command = args[0].toUpperCase()
        switch (command) {
            case "PING":
                socket.write(this.handlePing())
                break;
            case "ECHO":
                socket.write(this.handleEcho(args))
                break;
            case "SET":
                socket.write(this.handleSet(args))
                break;
            case "GET":
                socket.write(this.handleGet(args))
                break;
            case "INFO":
                socket.write(this.handleInfo())
                break;
            case "REPLCONF":
                if (args[1] === "listening-port") {
                    socket.write(Encoder.generateOkValue());
                } else {
                    socket.write(this.handleReplicaConfiguration(args));
                }
                break;
            case "PSYNC":
                socket.write(this.handlePsync())
                this.sendRDBfileForHandShake(socket)
                break;
            case "WAIT":
                break;
        }
    }

    handlePing() {
        return Encoder.generateSimpleString("PONG");
    }

    handleSet(args) {
        if (args.length === 3) {
            this.dataStore.insert(args[1], args[2]);
        } else {
            this.dataStore.insertWithExp(args[1], args[2], args[4])
        }
        return Encoder.generateOkValue();
    }
    handleGet(args) {
        return Encoder.generateBulkString(this.dataStore.get(args[1]));
    }

    handleEcho(args) {
        return Encoder.generateSimpleString(args[1]);
    }

    handleInfo() {
        return Encoder.generateInfoString("master", this.masterReplId, this.masterReplOffset);
    }

    sendRDBfileForHandShake(socket) {
        const RDB_File_Binary = Buffer.from(emptyRDBFileHex, "hex");
        socket.write(Buffer.concat([Buffer.from(`$${RDB_File_Binary.length}\r\n`), RDB_File_Binary]))
    }

    handlePsync() {
        let str = `+FULLRESYNC ${this.masterReplId} ${this.masterReplOffset}\r\n`
        return str;
    }

    handleReplicaConfiguration(args) {


    }
}


module.exports = {
    MasterServer
}