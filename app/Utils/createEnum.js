const createEnum = (...data) => {
    const enumObj = {};
    data.forEach((key, i) => {
        enumObj[key] = key;
    })
    return Object.freeze(enumObj);
}

module.exports = {
    createEnum
}