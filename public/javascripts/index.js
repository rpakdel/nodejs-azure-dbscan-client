(function() {
    class App {
        constructor(elements) {
            this.elements = elements
            this.elements.plotCanvas.addEventListener("click", this.onPlotCanvasClick.bind(this)) 
            this.elements.deleteAll.addEventListener("click", this.onDeleteAllClick.bind(this)) 
            this.loadDataFromServer().then(result => {
                this.data = result
                this.redrawPlot()
            })
        }

        onPlotCanvasClick(evt) {
            let rect = this.elements.plotCanvas.getBoundingClientRect()
            let x = evt.clientX - rect.left
            let y = evt.clientY - rect.top

            let point = [x, y]
            this.storePointToServer(point).then(result => {
                this.data.push(point)
                this.redrawPlot()
            })
        }

        onDeleteAllClick(evt) {
            this.deleteAllInServer().then(result => {
                this.data = []
                this.redrawPlot()
            })
        }

        redrawPlot() {
            let ctx = this.elements.plotCanvas.getContext("2d")
            ctx.clearRect(0, 0, this.elements.plotCanvas.width, this.elements.plotCanvas.height)
            this.drawPoints(this.data, ctx)
        }

        drawPoints(data, context) {
            let l = data.length
            for(let i = 0; i < l; i++) {
                let p = data[i]
                let x = p[0]
                let y = p[1]

                context.beginPath();
                context.arc(x, y, 3, 0, 2 * Math.PI, false);
                context.fillStyle = 'green';
                context.fill();
                //context.lineWidth = 5;
                //context.strokeStyle = '#003300';
                //context.stroke();
            }
        }

        loadDataFromServer() {
            return fetch("/api/v1/data", { method: "GET" }).then(res => res.json())
        }

        storePointToServer(point) {
            return fetch("/api/v1/point", { 
                method: "POST",
                body: JSON.stringify(point),
                headers: {
                    'Content-Type': 'application/json'
                }
            })
        }

        deleteAllInServer() {
            return fetch("/api/v1/deleteAll", { method: "GET" })
        }
    }   

    const elements = {
        plotContainer : document.getElementById("plotContainer"),
        plotCanvas: document.getElementById("plotCanvas"),
        deleteAll: document.getElementById("deleteAll"),
    }
    const app = new App(elements)
})()