const fs = require('fs')

function getSqlConnectionConfig() {
    if (fs.existsSync("./private-do-not-checkin.js")) {
        return require("./private-do-not-checkin.js").sql
    } else {
        return {
            userName: process.env.DBSCANUserName,
            password: process.env.DBSCANUserPassword,
            server: process.env.DBSCANServerName,
            options: {
              database: process.env.DBSCANDatabaseName,
              encrypt: true
            }
        }
    }
}

module.exports = getSqlConnectionConfig()