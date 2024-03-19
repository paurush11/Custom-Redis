

function isErrorValue(data) {
    return !data || data === "ERROR"
}
function handleErrorValue() {
    return `$-1\r\n`;
}
function handleOkValue() {
    return `+OK\r\n`;
}
function handleNullArrayErrorValue() {
    return `*-1\r\n`;
}
function encodeOutput(data) {
    if (isErrorValue(data)) {
        return handleErrorValue();
    }

    return `$${data.length}\r\n${data}\r\n`;
}
function encodeArrayOutput(dataArr) {
    if (!dataArr) {
        return handleNullArrayErrorValue();
    }
    if (dataArr.length === 0) {
        return `*0\r\n`;
    }
    let output = `*${dataArr.length}\r\n`
    for (let i = 0; i < dataArr.length; i++) {
        const ele = dataArr[i];
        if (typeof ele === "string") {
            output += encodeOutput(ele);
        } else if (typeof ele === "object") {
            output += encodeArrayOutput(ele);
        } else if (typeof ele === "number") {
            output += `:${ele}\r\n`
        }
    }

    return output;
}

// console.log(`*1\r\n$4\r\nping\r\n`)
// console.log(encodeOutput('ping'))
// // console.log(encodeArrayOutput([]))
// console.log(encodeArrayOutput(['ping']))
// console.log(encodeArrayOutput([1, 2, 3, 4]))
// console.log(encodeArrayOutput([1, 2, ["hello", "world"], 3, 4]))
// console.log(encodeArrayOutput([["hello", "world"], [3, 4]]))
const str = encodeArrayOutput(['replconf', 'getack', '*'])
console.log(str.length)
console.log(str)
module.exports = {
    encodeOutput,
    encodeArrayOutput,
    handleOkValue
}
