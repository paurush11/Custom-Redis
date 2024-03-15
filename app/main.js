const net = require("net");
const { Parser } = require("./parser");
// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");
const server = net.createServer((connection) => {
    connection.on('data', data => {
        const parser = new Parser(data.toString())
        console.log(parser.mappedValues)
        if (parser.mappedValues["PING"]) {
            for (let i = 0; i < parser.mappedValues["PING"].length; i++) {
                connection.write(`+PONG\r\n`)
            }
        } else if (parser.mappedValues["ECHO"]) {
            for (let i = 0; i < parser.mappedValues["ECHO"].length; i++) {
                connection.write(encodeOutput(parser.mappedValues["ECHO"][i]))
            }
        } else if (parser.mappedValues["GET"]) {
            for (let i = 0; i < parser.mappedValues["GET"].length; i++) {
                connection.write(encodeOutput(parser.getValue(parser.mappedValues["GET"][i])))
            }
        }

    })
})
server.listen(6379, "127.0.0.1");
