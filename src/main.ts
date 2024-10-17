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

// Point and Line types
interface Point {
    x: number;
    y: number;
}
type Line = Point[];

// Create global variables
const cursor = { isDrawing: false, x: 0, y: 0 };

const lines: Line[] = [];
const redoLines: Line[] = [];
let currentLine: Line = [];

const drawingChanged: Event = new Event("drawing-changed");

// Add the event listeners for mousedown, mousemove, and mouseup
canvas.addEventListener("mousedown", (e) => {
    cursor.isDrawing = true;
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;

    currentLine = [];
    lines.push(currentLine);
    redoLines.splice(0, redoLines.length);
    currentLine.push({ x: cursor.x, y: cursor.y });

    canvas.dispatchEvent(drawingChanged);
  });
  
canvas.addEventListener("mousemove", (e) => {
if (cursor.isDrawing) {
    drawLine(ctx, cursor.x, cursor.y, e.offsetX, e.offsetY);
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;

    currentLine.push({ x: cursor.x, y: cursor.y });

    canvas.dispatchEvent(drawingChanged);
}
});
  
canvas.addEventListener("mouseup", () => {
if (cursor.isDrawing) {
    cursor.isDrawing = false;

    currentLine = [];

    canvas.dispatchEvent(drawingChanged);
}
});

// Add event listener for drawing-changed event
canvas.addEventListener("drawing-changed", () => {
    clearCanvas(ctx);
    redraw(ctx);
});

app.append(document.createElement("br"));

// Create clear button
const clearButton = document.createElement("button");
clearButton.innerHTML = "Clear";
app.append(clearButton);

clearButton.addEventListener("click", () => {
    clearCanvas(ctx);
    lines.splice(0, lines.length);
});

// Create undo button
const undoButton = document.createElement("button");
undoButton.innerHTML = "Undo";
app.append(undoButton);

undoButton.addEventListener("click", () => {
if (lines.length > 0) {
    const line = lines.pop();
    if (line) redoLines.push(line);
    
    canvas.dispatchEvent(drawingChanged);
}
});

// Create redo button
const redoButton = document.createElement("button");
redoButton.innerHTML = "Redo";
app.append(redoButton);

redoButton.addEventListener("click", () => {
if (redoLines.length > 0) {
    const line = redoLines.pop();
    if (line) lines.push(line);

    canvas.dispatchEvent(drawingChanged);
}
});


// ----------------------------- Functions -----------------------------

// Draw line from (x1, y1) to (x2, y2)
function drawLine(context: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
    context.beginPath();
    context.strokeStyle = "black";
    context.lineWidth = 1;
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
    context.closePath();
}

function clearCanvas(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function redraw(ctx: CanvasRenderingContext2D) {
    for (const line of lines) {
        if (line.length > 1) {
            ctx.beginPath();
            const point: Point = line[0];
            ctx.moveTo(point.x, point.y);
            for (const point of line) {
                ctx.lineTo(point.x, point.y);
            }
            ctx.stroke();
        }
    }
}