
const createUid = (socket) => {
    return `${socket.remoteAddress}:${socket.remotePort}`
}

module.exports = {

    createUid
}
