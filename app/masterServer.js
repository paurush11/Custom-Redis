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
                break;
            case "GET":
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

    handleSet() {
        // this.dataStore.insert()

    }

    handleEcho(args) {
        console.log(args)
        return Encoder.generateSimpleString(args[0]);
    }
}


module.exports = {
    MasterServer
}