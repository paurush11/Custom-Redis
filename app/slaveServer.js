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
                if (!masterResponse.startsWith('+fullresync')) return;
                this.handShakeStep += 1;
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
        switch (command) {
            case "INFO":
                socket.write(this.handleInfo());
                break
        }

    }

    handleInfo() {
        return Encoder.generateInfoString("slave", this.masterReplId, this.masterReplOffset);
    }


}

module.exports = {
    SlaveServer
}