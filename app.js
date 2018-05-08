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

const redis = require("redis")
const redisConnectionConfig = require("./redisconnection")
const redisClient = redis.createClient(redisConnectionConfig)

function setRedisFromSQLServer() {
  return new Promise((res, rej) => {
    redisClient.flushdb((err, success) => {
      if (err) { 
        rej(err) 
      }
      else {
        ds.queryAll().then(data => {
          data.map(row => {
            redisClient.RPUSH(row.email, JSON.stringify(row.point))          
          })
          res()
        }).catch(err => console.log("Failed to query all data from SQL for Redis cache", err))
      }
    })
  })  
}

const ds = new DataStore(sqlConnectionConfig)
ds.connect().then(() => setRedisFromSQLServer())

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
let dbscanhost = "https://dbscan-algo.azurewebsites.net"

app.get('/api/v1/data/:radius/:minPts', (req, res) => {
  let radius = req.params.radius
  let minPts = req.params.minPts
  ds.query(email).then(data => {
    fetch(`${dbscanhost}/api/v1/dbscan/${radius}/${minPts}`, {
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
  }).catch(err => console.log("Failed to query data for email from SQL", err))
})

function getDataFromRedis(email) {
  return new Promise((res, rej) => {
    redisClient.lrange(email, 0, -1, (err, result) => {
      if (err) {
        rej(err)
      } else {
        let a = result.map(i => {
          return JSON.parse(i)
        })
        res(a)
      }
    })
  })  
}

app.get('/api/v1/cachedata/:radius/:minPts', (req, res) => {
  let radius = req.params.radius
  let minPts = req.params.minPts
  getDataFromRedis(email).then(data => {
    fetch(`${dbscanhost}/api/v1/dbscan/${radius}/${minPts}`, {
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
  }).catch(err => { 
    console.log("Failed to get data from redis")
    res.json({ 
      data: [], 
      dbscan: { 
        clusters: [], 
        noise: [] 
      } 
    })
  })
})

app.post('/api/v1/point/:clientId', (req, res) => {
  let point = req.body
  let clientId = req.params.clientId
  ds.storePoint(email, point).then(result => {
    redisClient.rpush(email, JSON.stringify(point), (err, reply) => {
      res.sendStatus(200)
      broadcastDataChangeNotification(email, clientId)
    })
  }).catch(err => console.log("Failed to store point in SQL", err))
})

app.get('/api/v1/deleteall/:clientId', (req, res) => {
  let clientId = req.params.clientId
  ds.deleteAll(email).then(result => {
    redisClient.del(email, 0, -1, (err, reply) => {
      res.sendStatus(200)
      broadcastDataChangeNotification(email, clientId)
    })
  }).catch(err => console.log("Failed to delete all from SQL", err))
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
