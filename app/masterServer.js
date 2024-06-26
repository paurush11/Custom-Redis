const net = require("net");
const { dataStore } = require("./dataStore");
const { createUid } = require("./Utils/sendMessages");
const { RequestParser } = require("./requestParser");
const { Encoder } = require("./Utils/encoder");
const { RDBFileParser } = require("./RDBFileParser");
const path = require("path");

class MasterServer {

    constructor(host, port, dir = '', filename = '') {
        this.port = port;
        this.host = host;
        this.dataStore = new dataStore()
        this.clientCommands = {}
        this.masterReplId = '8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb';
        this.masterReplOffset = 0;
        this.replicas = {}
        this.blockedClients = {}
        this.rdbFileDir = dir
        this.rdbFileName = filename
        this.setRdbFile()
    }

    setRdbFile() {
        if (this.rdbFileDir !== '' && this.rdbFileName !== '') {
            const rdbFilePath = path.join(this.rdbFileDir, this.rdbFileName);
            this.rdbFileParser = new RDBFileParser(rdbFilePath)
            this.rdbFileParser.parse()
            // this.dataStore = this.rdbFileParser.dataStore;
        }
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
                this.handleCommandsToReplica(currentRequest);
                break;
            case "GET":
                socket.write(this.handleGet(args))
                break;
            case "INFO":
                socket.write(this.handleInfo())
                break;
            case "REPLCONF":
                if (args[1] === "ACK") {
                    this.handleReplicaAcknowledgements(args);
                } else {
                    socket.write(Encoder.generateOkValue());
                }
                break;
            case "PSYNC":
                this.handlePsync(socket)
                this.replicas[createUid(socket)] = { socket, state: "connected" }
                break;
            case "WAIT":
                this.handleWait(args, socket, currentRequest)
                break;
            case "TYPE":
                socket.write(this.handleType(args));
                break;
            case "XADD":
                socket.write(this.handleStreams(args))
                break;
            case "XREAD":
            case "XRANGE":
                this.handleStreamRangeOutputs(args, socket)
                break;
            case "CONFIG":
                socket.write(this.handleRdbConfiguration(args))
                break;
            case "KEYS":
                socket.write(this.handleRdbKeysRead(args))
                break;
        }
    }


    handleRdbKeysRead(args) {
        if (args[1] === "*") {
            const keys = this.rdbFileParser.dataStore.allKeys();
            console.log(keys)
            return Encoder.generateBulkArray(keys);
        }
    }

    handleRdbConfiguration(args) {
        console.log(args)
        if (args[1].toUpperCase() === "GET") {
            if (args[2].toLowerCase() === 'dir')
                return Encoder.generateBulkArray(['dir', this.rdbFileDir])
            else if (args[2].toLowerCase() === 'dbfilename')
                return Encoder.generateBulkArray(['dbfilename', this.rdbFileName])
        }
    }

    unblockClient(stream_key, socket, stream_key_start_value, newDataArrived) {
        let timer = '0';
        this.blockedClients[stream_key].forEach((ele) => {
            if (ele.socket === socket && ele.stream_key === stream_key && ele.stream_key_start_value === stream_key_start_value) {
                timer = ele.timer;
            }
        })
        if (timer !== '0')
            this.blockedClients[stream_key] = this.blockedClients[stream_key].filter(ele => ele.socket !== socket);

        if (newDataArrived) {
            const value = Encoder.generateBulkArray(this.dataStore.getXStreamValues(stream_key, stream_key_start_value));
            return socket.write(value)

        } else {
            if (timer !== '0')
                socket.write(Encoder.handleErrorValue());
        }
    }


    handleStreamRangeOutputs(args, socket) {
        if (args[0].toUpperCase() === "XRANGE") {
            const stream_key = args[1];
            const stream_key_start_value = args[2];
            const stream_key_end_value = args[3];
            const value = this.dataStore.getStreamValues(stream_key, stream_key_start_value, stream_key_end_value);
            return socket.write(value)
        } else {
            if (args.length === 4) {
                const stream_key = args[2]
                const stream_key_start_value = args[3]
                const value = Encoder.generateBulkArray(this.dataStore.getXStreamValues(stream_key, stream_key_start_value));
                return socket.write(value)
            } else {
                if (args[1].toUpperCase() === "BLOCK") {
                    const timer = args[2]
                    const stream_key = args[4]
                    let stream_key_start_value = args[5];
                    if (stream_key_start_value === '$') {
                        stream_key_start_value = this.dataStore.getLastElementFromStream(stream_key)
                    }

                    setTimeout(() => {
                        this.unblockClient(stream_key, socket, stream_key_start_value, false);
                    }, timer);
                    /// block the client till the timeout. if new data arives unblock it. if no new data arrives then unblock it and give null array/
                    if (this.blockedClients[stream_key]) {
                        this.blockedClients[stream_key].push({ socket, stream_key_start_value, stream_key, timer })
                    } else {
                        this.blockedClients[stream_key] = [{ socket, stream_key_start_value, stream_key, timer }]
                    }

                    setTimeout(() => {

                    }, timer)

                } else {
                    let mid = (args.length - 2) / 2 + 2
                    let j = mid;
                    let value = [];
                    for (let i = 2; i < mid; i++, j++) {
                        const stream_key = args[i]
                        const stream_key_start_value = args[j]
                        const val = this.dataStore.getXStreamValues(stream_key, stream_key_start_value);
                        value = [...value, ...val]
                    }
                    return socket.write(Encoder.generateBulkArray(value));
                }
            }
        }
    }

    handleStreams(args) {
        const stream_key = args[1];
        const stream_key_value = args[2];
        const streamObject = {}
        for (let i = 1; i < args.length; i += 2) {
            streamObject[args[i]] = args[i + 1];
        }
        const message = this.dataStore.insertStream(stream_key, streamObject, stream_key_value);
        if (!message)
            return Encoder.generateBulkString(stream_key_value);
        if (this.blockedClients[stream_key]) {
            this.blockedClients[stream_key].forEach((ele) => {
                this.unblockClient(stream_key, ele.socket, stream_key_value, true);
            })
        }

        return message
    }

    handleType(args) {
        const key = args[1];
        return Encoder.generateSimpleString(this.dataStore.type(key));
    }

    handleCommandsToReplica(currentRequest) {
        for (const [key, value] of Object.entries(this.replicas)) {
            let replicaSocket = value.socket;
            replicaSocket.write(currentRequest)
        }
        this.masterReplOffset += currentRequest.length;
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
        if (this.rdbFileDir !== '' && this.rdbFileName !== '') {
            const keyValPair = this.rdbFileParser.dataStore
            const value = keyValPair.get(args[1]);
            if (!value) {
                return Encoder.generateBulkString(this.dataStore.get(args[1]));
            }
            console.log(value)
            return Encoder.generateBulkString(value);
        }
        return Encoder.generateBulkString(this.dataStore.get(args[1]));
    }

    handleEcho(args) {
        return Encoder.generateSimpleString(args[1]);
    }

    handleInfo() {
        return Encoder.generateInfoString("master", this.masterReplId, this.masterReplOffset);
    }

    handlePsync(socket) {
        socket.write(`+FULLRESYNC ${this.masterReplId} ${this.masterReplOffset}\r\n`)
        const emptyRDBFileHex = "524544495330303131fa0972656469732d76657205372e322e30fa0a72656469732d62697473c040fa056374696d65c26d08bc65fa08757365642d6d656dc2b0c41000fa08616f662d62617365c000fff06e3bfec0ff5aa2"
        const RDB_File_Binary = Buffer.from(emptyRDBFileHex, "hex");
        socket.write(Buffer.concat([Buffer.from(`$${RDB_File_Binary.length}\r\n`), RDB_File_Binary]))
    }

    handleWait(args, socket, request) {
        const [waitCommand, noOfReqReplies, exp] = args
        /// How to know if request has been processed

        /// when processing master command in slave server, masterReplOffset increases to the request length.

        /// So any replica which has processed this command has also processed previous command
        /// ask all the replicas to send their ack.

        ///No replicas
        if (Object.keys(this.replicas).length === 0) {
            return socket.write(Encoder.createInteger(0));
        }

        /// No commands sent to replicas to all will process

        if (this.masterReplOffset === 0) {
            return socket.write(Encoder.createInteger(Object.keys(this.replicas).length));

        }


        this.wait = {}
        this.wait.noOfAckReplies = 0;
        this.wait.noOfReqReplies = noOfReqReplies;
        this.wait.timeout = setTimeout(() => {
            this.handleWaitResponse();
        }, exp);
        this.wait.socket = socket
        this.wait.request = request;
        this.wait.isDone = false;

        for (const [key, val] of Object.entries(this.replicas)) {
            const replicaSocket = val.socket;
            replicaSocket.write(Encoder.generateBulkArray(['REPLCONF', 'GETACK', "*"]));
        }
    }

    handleWaitResponse() {
        clearTimeout(this.wait.timeout);
        this.masterReplOffset += this.wait.request.length
        this.wait.socket.write(`:${this.wait.noOfAckReplies}\r\n`);
        this.wait.isDone = true;
    }

    handleReplicaAcknowledgements(args) {
        if (this.wait.isDone) return;
        const replicaMasterOffset = args[2];
        if (replicaMasterOffset >= this.masterReplOffset) {
            this.wait.noOfAckReplies++;
            if (this.wait.noOfAckReplies >= this.wait.noOfReqReplies) {
                this.handleWaitResponse()
            }
        }
    }
}


module.exports = {
    MasterServer
}