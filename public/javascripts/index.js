(function() {
    class App {
        constructor(elements) {
            this.elements = elements
            this.elements.plotCanvas.addEventListener("click", this.onPlotCanvasClick.bind(this)) 
            this.elements.deleteAll.addEventListener("click", this.onDeleteAllClick.bind(this))             

            this.clientId = Math.random()            

            this.connectToServer("rpakdel@gmail.com", this.clientId, this.setDataAndDrawPlot.bind(this))            

            this.clusterColors = []
            this.setDataAndDrawPlot()
        }

        connectToServer(email, clientId, onDataChanged) {
            this.disconnectFromServer(email)
            if (location.protocol === "https:") {
                this.webSocket = new WebSocket(`wss://${location.host}`)
            } else {
                this.webSocket = new WebSocket(`ws://${location.host}`)
            }
            
            this.webSocket.addEventListener("open", event => {
                this.webSocket.send(JSON.stringify({
                    email: email,
                    clientId: clientId,
                    connect: true
                }))
            })
            
            this.webSocket.addEventListener("message", event => {
                let j = JSON.parse(event.data)
                if (j.event && j.event === "datachanged") {
                    //ignore clientId for now
                    //if (j.clientId != clientId) {
                        onDataChanged()
                    //}
                }
            })
        }

        disconnectFromServer(email) {
            if (this.webSocket != null) {
                this.webSocket.send(JSON.stringify({
                    email: email,
                    clientId: clientId,
                    connect: false
                }))
                this.webSocket.close()
                this.webSocket = null
            }
        }

        onPlotCanvasClick(evt) {
            let rect = this.elements.plotCanvas.getBoundingClientRect()
            let x = evt.clientX - rect.left
            let y = evt.clientY - rect.top

            let point = [x, y]
            this.storePointToServer(point).then(result => {                
            })
        }

        onDeleteAllClick(evt) {
            this.deleteAllInServer().then(result => {                
            })
        }

        getClusterColors(numClusters) {
            if (this.clusterColors.length < numClusters)
            {
                for(let i = this.clusterColors.length; i < numClusters; i++) {
                    let r = Math.floor(Math.random() * 255)
                    let g = Math.floor(Math.random() * 255)
                    let b = Math.floor(Math.random() * 255)
                    this.clusterColors.push("rgb(" + r + "," + g + "," + b + ")")
                }
            }
            return this.clusterColors
        }

        drawPlot(data, numClusters) {
            let ctx = this.elements.plotCanvas.getContext("2d")
            ctx.clearRect(0, 0, this.elements.plotCanvas.width, this.elements.plotCanvas.height)
            let clusterColors = this.getClusterColors(numClusters)
            this.drawPoints(data, clusterColors, ctx)
        }

        drawPoints(data, clusterColors, context) {
            let l = data.length            
            for(let i = 0; i < l; i++) {
                let p = data[i]
                let x = p[0]
                let y = p[1]
                let clusterIndex = p[2]
                let color = "green"
                if (clusterIndex >= 0) {
                    color = clusterColors[clusterIndex]
                }

                context.beginPath();
                context.arc(x, y, 3, 0, 2 * Math.PI, false);
                context.fillStyle = color;
                context.fill();
                //context.lineWidth = 5;
                //context.strokeStyle = '#003300';
                //context.stroke();
            }
        }

        setDataAndDrawPlot() {
            this.loadDataFromServer().then(result => {
                this.data = result.data
                this.dbscan = result.dbscan
                this.drawPlot(this.data, this.dbscan.clusters.length)
            })
        }

        loadDataFromServer() {
            return fetch("/api/v1/cachedata/50/5", { method: "GET" }).then(res => res.json())
        }

        storePointToServer(point) {
            return fetch(`/api/v1/point/${this.clientId}`, { 
                method: "POST",
                body: JSON.stringify(point),
                headers: {
                    'Content-Type': 'application/json'
                }
            })
        }

        deleteAllInServer() {
            return fetch(`/api/v1/deleteAll/${this.clientId}`, { method: "GET" })
        }
    }   

    const elements = {
        plotContainer : document.getElementById("plotContainer"),
        plotCanvas: document.getElementById("plotCanvas"),
        deleteAll: document.getElementById("deleteAll"),
    }
    const app = new App(elements)
})()