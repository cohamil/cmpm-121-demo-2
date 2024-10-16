import "./style.css";

const APP_NAME = "Knockoff MS Paint";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;
const header = document.createElement("h1");
header.innerHTML = APP_NAME;
app.append(header);

// create canvas
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
app.append(canvas);
const ctx = canvas.getContext("2d");
if (!ctx) {
  throw new Error("Failed to get 2d context from canvas");
}

// Create global variables
const cursor = { isDrawing: false, x: 0, y: 0 };

// Add the event listeners for mousedown, mousemove, and mouseup
canvas.addEventListener("mousedown", (e) => {
    cursor.isDrawing = true;
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
  });
  
canvas.addEventListener("mousemove", (e) => {
if (cursor.isDrawing) {
    drawLine(ctx, cursor.x, cursor.y, e.offsetX, e.offsetY);
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
}
});
  
addEventListener("mouseup", (e) => {
if (cursor.isDrawing) {
    drawLine(ctx, cursor.x, cursor.y, e.offsetX, e.offsetY);
    cursor.x = 0;
    cursor.y = 0;
    cursor.isDrawing = false;
}
});

// Create clear button
const clearButton = document.createElement("button");
clearButton.innerHTML = "Clear";
app.append(clearButton);

clearButton.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});


// ----------------------------- Functions -----------------------------


function drawLine(context: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
    context.beginPath();
    context.strokeStyle = "black";
    context.lineWidth = 1;
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
    context.closePath();
}