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

// Structure for a line
interface LineStructure {
    line: Line;
    drag(point: Point): void;
    display(ctx: CanvasRenderingContext2D): void;
}

// Line class that implements LineStructure
class MarkerLine implements LineStructure {
    line: Line;

    constructor(point: Point) {
        this.line = [point];
    }
    drag(point: Point) {
        this.line.push(point);
    }
    display(ctx: CanvasRenderingContext2D) {
        ctx.strokeStyle = "black";
        ctx.lineWidth = 1;
        ctx.beginPath();
        const point: Point = this.line[0];
        ctx.moveTo(point.x, point.y);
        for (const point of this.line) {
            ctx.lineTo(point.x, point.y);
        }
        ctx.stroke();
        ctx.closePath();
        
    }
}

// Create global variables
let isDrawing = false;

const lines: MarkerLine[] = [];
const redoLines: MarkerLine[] = [];
let currentLine: MarkerLine | null = null;

const drawingChanged: Event = new Event("drawing-changed");

// Add the event listeners for mousedown, mousemove, and mouseup
canvas.addEventListener("mousedown", (e) => {
    isDrawing = true;

    currentLine = new MarkerLine({ x: e.offsetX, y: e.offsetY });
    lines.push(currentLine);
    redoLines.splice(0, redoLines.length);
    
    canvas.dispatchEvent(drawingChanged);
  });
  
canvas.addEventListener("mousemove", (e) => {
if (isDrawing) {
    if (currentLine) currentLine.drag({ x: e.offsetX, y: e.offsetY });

    canvas.dispatchEvent(drawingChanged);
}
});
  
canvas.addEventListener("mouseup", () => {
if (isDrawing) {
    isDrawing = false;

    currentLine = null;

    canvas.dispatchEvent(drawingChanged);
}
});

// Add event listener for drawing-changed event
canvas.addEventListener("drawing-changed", () => {
    redraw(ctx);
});

app.append(document.createElement("br"));

// Create clear button
const clearButton = document.createElement("button");
clearButton.innerHTML = "Clear";
app.append(clearButton);

clearButton.addEventListener("click", () => {
    lines.splice(0, lines.length);
    canvas.dispatchEvent(drawingChanged);
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

function redraw(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    lines.forEach((line) => line.display(ctx));

    if (currentLine) {
        currentLine.display(ctx);
    }
}