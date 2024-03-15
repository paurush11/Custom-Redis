const net = require("net");
const { Parser } = require("./parser");

const clientParsers = new Map();
// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");
const server = net.createServer((connection) => {
    const clientId = `${connection.remoteAddress}:${connection.remotePort}`;
    if (!clientParsers.has(clientId)) {
        clientParsers.set(clientId, new Parser());
    }

    const parser = clientParsers.get(clientId);
    connection.on('data', data => {
        parser.setData(data.toString());
        for (let i = 0; i < parser.pingCount; i++) {
            connection.write(`+PONG\r\n`)
        }
        if (parser.mappedValues["ECHO"]) {
            for (let i = 0; i < parser.mappedValues["ECHO"].length; i++) {
                connection.write(parser.encodeOutput(parser.mappedValues["ECHO"][i]))
            }
        }
        if (parser.mappedValues["SET"]) {
            for (let i = 0; i < parser.mappedValues["SET"].length; i++) {
                connection.write(`+OK\r\n`)
            }
           
        }
        if (parser.mappedValues["GET"]) {
            for (let i = 0; i < parser.mappedValues["GET"].length; i++) {
                const val = parser.getValue(parser.mappedValues["GET"][i]);

                connection.write(parser.encodeOutput(val))
            }
        }
        
        this.resetParser();

    })

    connection.on('close', () => {
        // Remove the parser when the client disconnects
        clientParsers.delete(clientId);
    });

})
server.listen(6379, "127.0.0.1");
