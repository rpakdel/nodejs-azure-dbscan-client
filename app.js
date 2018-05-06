const fs = require('fs')

const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session')

const WebSocket = require("ws")

const DataStore = require("./datastore")
const sqlConnectionConfig = require("./sqlconnection")

const fetch = require("node-fetch")

const ds = new DataStore(sqlConnectionConfig)
ds.connect()

const app = express();

let webSocketServer = null;
let webSocketClients = []

app.initWebSocket = function(server) {
  webSocketServer = new WebSocket.Server({ server })

  webSocketServer.on("connection", wsSocket => {
    console.log("WebSocket socket client connected")
    wsSocket.on("message", data => {
      let j = JSON.parse(data)
      if (j.email) {
        let o = { 
          email: j.email, 
          clientId: j.clientId, 
          wsSocket: wsSocket }
        if (j.connect) {
          webSocketClients.push(o)
        } else {
          // remove the socket from client list
          webSocketClients = webSocketClients.filter(w => w.wsSocket !== j.wsSocket)
        }
      }
    })
    // remove yourself from client list
    wsSocket.on("close", () => {
      webSocketClients = webSocketClients.filter(w => w.wsSocket !== wsSocket)
    })
  })
}

function broadcastDataChangeNotification(email, clientId) {
  webSocketClients.map(w => {
    if (w.email === email) {
      let j = {
        event: "datachanged",
        email: email,
        clientId: clientId
      }
      w.wsSocket.send(JSON.stringify(j))
    }
  })
}

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

app.get('/api/v1/data/:radius/:minPts', (req, res) => {
  let radius = req.params.radius
  let minPts = req.params.minPts
  ds.query(email).then(data => {
    fetch(`http://localhost:3030/api/v1/dbscan/${radius}/${minPts}`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(response => response.json().then(j => {
      let dbscan = JSON.parse(j)
      // add the cluster index to each point
      for(let clusterIndex = 0; clusterIndex < dbscan.clusters.length; clusterIndex++) {
        let cluster = dbscan.clusters[clusterIndex]
        for(let i = 0; i < cluster.length; i++) {
          let pointIndex = cluster[i]
          data[pointIndex].push(clusterIndex)
        }
      }
      // tag noise points with cluster value -1
      for(let i2 = 0; i2 < dbscan.noise.length; i2++) {
        let pointIndex = dbscan.noise[i2]
        data[pointIndex].push(-1)
      }

      let result = {
        data,
        dbscan
      }
      res.json(result)
    }))    
  })
})

app.post('/api/v1/point/:clientId', (req, res) => {
  let point = req.body
  let clientId = req.params.clientId
  ds.storePoint(email, point).then(result => {
    res.sendStatus(200)
    broadcastDataChangeNotification(email, clientId)
  })
})

app.get('/api/v1/deleteall/:clientId', (req, res) => {
  let clientId = req.params.clientId
  ds.deleteAll(email).then(result => {
    res.sendStatus(200)
    broadcastDataChangeNotification(email, clientId)
  })
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
