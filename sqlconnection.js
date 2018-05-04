const fs = require('fs')

function getSqlConnectionConfig() {
    if (fs.existsSync("./private-do-not-checkin.js")) {
        return require("./private-do-not-checkin.js")
    } else {
        return {
            userName: process.env.UserName,
            password: process.env.Password,
            server: process.env.ServerName,
            options: {
              database: process.env.DatabaseName,
              encrypt: true
            }
        }
    }
}

module.exports = getSqlConnectionConfig()