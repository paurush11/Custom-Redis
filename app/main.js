const { MasterServer } = require("./masterServer");
const { SlaveServer } = require("./slaveServer");

const HOST = 'localhost';
const PORT = '6379';

const func = (args) => {
    console.log(args)
    if (args.length === 0) {
        let server = new MasterServer(HOST, PORT)
        server.startServer();
    } else if (args.length === 2) {
        const [portFlag, port] = args;
        let server = new MasterServer(HOST, port)
        server.startServer();
    } else if (args.length === 4) {
        const directory = args[1];
        const fileName = args[3];
        let server = new MasterServer(HOST, PORT, directory, fileName)
        server.startServer();
    }
    else if (args.length === 5) {
        const [portFlag, port, replicaFlag, masterHost, masterPort] = args;
        let server = new SlaveServer(HOST, port, masterHost, masterPort)
        server.startServer();
    }
}

func(process.argv.slice(2));
