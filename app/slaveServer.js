const { createUid } = require("./Utils/sendMessages");
const { dataStore } = require("./dataStore");
const net = require("net");
const { RequestParser } = require("./requestParser");
const { Encoder } = require("./Utils/encoder");

class SlaveServer {

    constructor(host, port, masterHost, masterPort) {
        this.host = host;
        this.port = port;
        this.masterHost = masterHost;
        this.masterPort = masterPort;
        this.dataStore = new dataStore()
        this.clientCommands = {}
        this.masterReplId = ''
        this.masterReplOffset = 0
        this.handShakeStep = 0
    }

    startServer() {
        this.performHandshake()
        const server = net.createServer((socket) => {
            const clientKey = createUid(socket);
            this.clientCommands[clientKey] = ''

            socket.on('data', (data) => {
                this.clientCommands[clientKey] += data.toString();
                this.processClientCommands(socket);
            })

            socket.on('error', (err) => {
                console.log(`Slave Server Error: ${err}`);
            })

            socket.on('close', () => {
                console.log(`Slave Server Closed`);
            })
        })

        server.listen(this.port, this.host, () => {
            console.log(`Slave Server Listening on ${this.host}:${this.port}`);
        })

    }


    performHandshake() {
        const socket = net.createConnection({ host: this.masterHost, port: this.masterPort }, () => {
            console.log(`Connected to master server on ${this.masterHost}:${this.masterPort}`);
        });

        this.masterSocket = socket;
        socket.write(Encoder.generateBulkArray(['ping']))
        this.handShakeStep += 1;

        socket.on("data", (data) => {
            let masterResponse = data.toString();

            if (this.handShakeStep === 1) {
                if (masterResponse !== Encoder.generateSimpleString('PONG')) return;
                this.handShakeStep += 1;
                socket.write(Encoder.generateBulkArray(['REPLCONF', 'listening-port', this.port.toString()]))
            } else if (this.handShakeStep === 2) {
                if (masterResponse !== Encoder.generateOkValue()) return;
                this.handShakeStep += 1;
                socket.write(Encoder.generateBulkArray(['REPLCONF', 'capa', 'psync2']))
            } else if (this.handShakeStep === 3) {
                if (masterResponse !== Encoder.generateOkValue()) return;
                this.handShakeStep += 1;
                socket.write(Encoder.generateBulkArray(['PSYNC', '?', '-1']))
            } else if (this.handShakeStep === 4) {
                if (!masterResponse.startsWith('+')) return;
                this.handShakeStep += 1;
                ///handle file rdb
                let idx = masterResponse.indexOf('\r\n');
                idx += 3;
                let sizeOfRDB = 0;
                while (masterResponse[idx] !== '\r') {
                    sizeOfRDB = (sizeOfRDB * 10) + (masterResponse[idx] - '0');
                    idx++;
                }
                idx += 2; // now real data
                let rdbData = masterResponse.slice(idx, idx + sizeOfRDB)
                idx += sizeOfRDB - 1;
                masterResponse = data.toString().slice(idx);
                this.masterCommands = ''
                console.log("here back")
                console.log(this.handShakeStep)
            }
            if (this.handShakeStep === 5) {
                console.log("here")
                if (masterResponse === '') return;
                this.masterCommands += masterResponse
                this.processMasterCommand();
            }


        })


    }

    processClientCommands(socket) {
        const clientKey = createUid(socket);
        const clientCommands = this.clientCommands[clientKey];
        let requestParser = new RequestParser(clientCommands);
        while (true) {
            const args = requestParser.parse();
            if (args.length === 0) {
                break;
            }
            let currentRequest = requestParser.currentRequest;
            this.handleCommands(args, socket, currentRequest)
        }
        this.clientCommands[clientKey] = requestParser.getRemainingRequest();

    }

    handleCommands(args, socket, currentRequest) {
        let command = args[0].toUpperCase();
        console.log(command)
        switch (command) {
            case "INFO":
                socket.write(this.handleInfo());
                break
            case "SET":
                this.handleSet(args);
                break;
            case "GET":
                socket.write(this.handleGet(args));
                break;
            case "REPLCONF":
                break;
        }

    }

    processMasterCommand() {
        let requestParser = new RequestParser(this.masterCommands);
        while (true) {
            const args = requestParser.parse();
            if (args.length === 0) {
                break;
            }
            let currentRequest = requestParser.currentRequest;
            this.handleCommands(args, this.masterSocket, currentRequest)
            this.masterReplOffset += currentRequest.length;
        }
        this.masterCommands = requestParser.getRemainingRequest();

    }

    handleInfo() {
        return Encoder.generateInfoString("slave", this.masterReplId, this.masterReplOffset);
    }

    handleSet(args) {
        if (args.length === 3) {
            this.dataStore.insert(args[1], args[2]);
        } else {
            this.dataStore.insertWithExp(args[1], args[2], args[4])
        }
    }
    handleGet(args) {
        let value = this.dataStore.get(args[1]);
        if (!value) {
            return Encoder.generateBulkString('');
        }
        return Encoder.generateBulkString(value);
    }
}

module.exports = {
    SlaveServer
}