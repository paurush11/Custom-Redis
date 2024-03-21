class Encoder {
    static createInteger(val) {
        return `:${val}\r\n`
    }
    static generateInfoString(role, masterReplId, masterReplOffset) {
        const info = {
            role: role,
            master_replid: masterReplId,
            master_repl_offset: masterReplOffset
        }

        return this.generateBulkString(Object.entries(info).map(([key, value]) => `${key}:${value}`).join('\r\n'));
    }

    static generateOkValue() {
        return `+OK\r\n`;
    }
    static generateNullArrayErrorValue() {
        return `*-1\r\n`;
    }

    static isErrorValue(data) {
        return !data || data === "ERROR"
    }
    static handleErrorValue() {
        return `$-1\r\n`;
    }

    static generateSimpleString(string) {
        return `+${string}\r\n`;
    }

    static generateBulkString(data) {
        if (this.isErrorValue(data)) {
            return this.handleErrorValue();
        }
        return `$${data.length}\r\n${data}\r\n`;
    }

    static generateBulkArray(dataArr) {
        if (!dataArr) {
            return this.generateNullArrayErrorValue();
        }
        if (dataArr.length === 0) {
            return `*0\r\n`;
        }
        let output = `*${dataArr.length}\r\n`
        for (let i = 0; i < dataArr.length; i++) {
            const ele = dataArr[i];
            if (typeof ele === "string") {
                output += this.generateBulkString(ele);
            } else if (typeof ele === "object") {
                output += this.generateBulkArray(ele);
            } else if (typeof ele === "number") {
                output += `:${ele}\r\n`
            }
        }
        return output;
    }
}


module.exports = {
    Encoder
}