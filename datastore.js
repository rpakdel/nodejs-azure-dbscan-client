var Connection = require('tedious').Connection;
var Request = require('tedious').Request;
var TYPES = require('tedious').TYPES;

class DataStore {
    constructor(sqlConnectionConfig) {
        this.sqlConnectionConfig = sqlConnectionConfig
    }

    connect() {
        return new Promise((res, rej) => {
            console.log(`> Connection config ${this.sqlConnectionConfig}`)
            this.connection = new Connection(this.sqlConnectionConfig)
            this.connection.on('connect', err => {
                if (err) {
                    console.log(err)
                    rej(err)
                } else {
                    console.log(`> Connected to ${this.sqlConnectionConfig.options.database}`)
                    res()
                }
            })
        })
    }

    queryAll() { 
        return new Promise((res, rej) => {
          let request = new Request(
            "SELECT [data].[email] as email, [data].[x] as x, [data].[y] as y FROM [data]", (err, rowCount, rows) => {
              if (err) rej(err)
              else console.log(`> ${rowCount} rows in DB`)
            })
      
            let data = []
            request.on('row', columns => {
                let email = columns[0].value
                let x = columns[1].value
                let y = columns[2].value
                data.push({
                    email: email,
                    point: [x, y]
                })
            })
      
            request.on('done', (rowCount, more, rows) => {
              res(data)
            })
      
            request.on('doneInProc', (rowCount, more, rows) => {
              res(data)
            })
      
            request.on('doneProc', (rowCount, more, returnStatus, rows) => { 
              res(data)
            })

            this.connection.execSql(request)
        })
    }

    query(email) { 
        return new Promise((res, rej) => {
          let request = new Request(
            "SELECT [data].[email] as email, [data].[x] as x, [data].[y] as y FROM [data] WHERE [data].[email] = @email", (err, rowCount, rows) => {
              if (err) rej(err)
              else console.log(`> ${email} has ${rowCount} rows in DB`)
            })
            request.addParameter("email", TYPES.NVarChar, email)
      
            let data = []
            request.on('row', columns => {
                let email = columns[0].value
                let x = columns[1].value
                let y = columns[2].value
                data.push([x, y])
            })
      
            request.on('done', (rowCount, more, rows) => {
              res(data)
            })
      
            request.on('doneInProc', (rowCount, more, rows) => {
              res(data)
            })
      
            request.on('doneProc', (rowCount, more, returnStatus, rows) => { 
              res(data)
            })

            this.connection.execSql(request)
        })
    }

    storePoint(email, point) {
        return new Promise((res, rej) => {
            let request = new Request(
                "INSERT INTO [data] VALUES (@email, @x, @y)", (err) => {
                    if (err) rej(err)
                })

            request.addParameter("email", TYPES.NVarChar, email)
            request.addParameter("x", TYPES.Real, point[0])
            request.addParameter("y", TYPES.Real, point[1])
    
            request.on('done', (rowCount, more, rows) => {
                res(rowCount)
            })
    
            request.on('doneInProc', (rowCount, more, rows) => {
                res(rowCount)
            })
    
            request.on('doneProc', (rowCount, more, returnStatus, rows) => { 
                res(rowCount)
            });
            this.connection.execSql(request)
        })
    }

    deleteAll(email) {
        return new Promise((res, rej) => {
            let request = new Request(
                "DELETE FROM [data] WHERE [data].[email] = @email", (err) => {
                    if (err) rej(err)
                })

                request.addParameter("email", TYPES.NVarChar, email)
        
                request.on('done', (rowCount, more, rows) => {
                    res(rowCount)
                })
        
                request.on('doneInProc', (rowCount, more, rows) => {
                    res(rowCount)
                })
        
                request.on('doneProc', (rowCount, more, returnStatus, rows) => { 
                    res(rowCount)
                });
                this.connection.execSql(request)
            })
        }
    }

module.exports = DataStore


  