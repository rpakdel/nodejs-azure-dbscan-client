const fs = require('fs')

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session')

const DataStore = require("./datastore")
const sqlConnectionConfig = require("./sqlconnection")


let ds = new DataStore(sqlConnectionConfig)
ds.connect()

var app = express();

// view engine setup

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}))

let email = "rpakdel@gmail.com"

app.get('/api/v1/data', (req, res) => {
  ds.query(email).then(data => res.json(data))
})

app.post('/api/v1/point', (req, res) => {
  let point = req.body
  ds.storePoint(email, point).then(result => res.sendStatus(200))
})

app.get('/api/v1/deleteall', (req, res) => {
  ds.deleteAll(email).then(result => res.sendStatus(200))
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
