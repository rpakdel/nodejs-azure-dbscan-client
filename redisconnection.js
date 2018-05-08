const fs = require('fs')

function getRedisConnectionConfig() {
    if (fs.existsSync("./private-do-not-checkin.js")) {
        return require("./private-do-not-checkin.js").redis
    } else {
        return {
            host: process.env.RedisHost,
            port: process.env.RedisPort,
            auth_pass: process.env.RedisPrimaryKey
        }
    }
}

module.exports = getRedisConnectionConfig()