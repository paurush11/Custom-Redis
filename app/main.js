const net = require("net");
const { parseInput, encodeOutput } = require("./parser");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");
const server = net.createServer((connection) => {
    connection.on('data', data => {
        console.log(data.toString())
        const mappedValues = parseInput(data, {});
        if(mappedValues["PING"]){
            for(let i = 0;i<mappedValues["PING"].length;i++){
                connection.write(`+PONG\r\n`)
            }
        }else if(mappedValues["ECHO"]){
            for(let i = 0;i<mappedValues["ECHO"].length;i++){
                connection.write(encodeOutput(mappedValues["ECHO"][i]))
            }
        }
       
    })
})
server.listen(6379, "127.0.0.1");
