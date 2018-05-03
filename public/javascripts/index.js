(function() {
    class App {
        constructor(elements) {
            this.elements = elements
            this.elements.plotCanvas.addEventListener("click", this.onPlotCanvasClick.bind(this)) 
            this.data = []
            this.loadDataFromServer()
        }

        onPlotCanvasClick(evt) {
            let rect = this.elements.plotCanvas.getBoundingClientRect()
            let x = evt.clientX - rect.left
            let y = evt.clientY - rect.top

            this.data.push([x, y])
            this.redrawPlot()
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
            fetch("/api/v1/data", { method: "GET"}).then(res => res.json()).then(res => {
                this.data = res
                this.redrawPlot()
            });
        }
    }   

    const elements = {
        plotContainer : document.getElementById("plotContainer"),
        plotCanvas: document.getElementById("plotCanvas")
    }
    const app = new App(elements)
})()