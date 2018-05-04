const fs = require('fs')

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var Connection = require('tedious').Connection;
var Request = require('tedious').Request;

const sqlConnectionConfig = require("./sqlconnection")

var connection = new Connection(sqlConnectionConfig)
connection.on('connect', err => {
  if (err) console.log(err)
  else queryDatabase(connection, "rpakdel@gmail.com")
})

function queryDatabase(cn, email) { 
  return new Promise((res, rej) => {
    let request = new Request(
      "SELECT [data].[email] as email, [data].[x] as x, [data].[y] as y FROM [data] WHERE [data].[email] = '" + email + "'", (err, rowCount, rows) => {
        if (err) rej(err)
      })

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
      });
      cn.execSql(request)
    })
  }

var app = express();

// view engine setup

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));



app.get('/api/v1/data', (req, res) => {
  queryDatabase(connection, "rpakdel@gmail.com").then(data => res.json(data))
})

app.use('/', (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"))
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
