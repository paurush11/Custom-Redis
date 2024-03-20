const net = require("net");
const { dataStore } = require("./dataStore");
const { createUid } = require("./Utils/sendMessages");
const { RequestParser } = require("./requestParser");
const { Encoder } = require("./Utils/encoder");

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
            console.log(`Server Listening on ${this.host}:${this.port}`);
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
                break;
            case "REPLCONF":
                break;
            case "PSYNC":
                break;
            case "WAIT":
                break;
        }
    }

    handlePing() {
        return Encoder.generateSimpleString("PONG");
    }

    handleSet(args) {
        console.log("here")
        this.dataStore.insert(args[1], args[2]);
        return Encoder.generateOkValue();
    }
    handleGet(args) {
        console.log(this.dataStore.get(args[1]))
        return Encoder.generateBulkString(this.dataStore.get(args[1]));
    }

    handleEcho(args) {
        return Encoder.generateSimpleString(args[1]);
    }
}


module.exports = {
    MasterServer
}