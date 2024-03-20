class SlaveServer {

    constructor(host, port, masterHost, masterPort){
        this.host = host;
        this.port = port;
        this.masterHost = masterHost;
        this.masterPort = masterPort;
        this.dataStore = new dataStore()
        this.clientCommands = {}
    }

}

module.exports = {
    SlaveServer
}