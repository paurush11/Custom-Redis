const net = require("net")

const createUid = (socket) => {
    return `${socket.remoteAddress}:${socket.remotePort}`
}