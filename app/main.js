const net = require("net");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");
const server = net.createServer((connection) => {
    connection.on('data', data => {

        console.log(JSON.parse(data));
        console.log("jhi");
        connection.write(`+PONG\r\n`)
    })
})
server.listen(6379, "127.0.0.1");
// Uncomment this block to pass the first stage
// const server = net.createServer((connection) => {
//   // Handle connection
// });
//
// server.listen(6379, "127.0.0.1");
