import "./style.css";

const APP_NAME = "Knockoff MS Paint";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;
const header = document.createElement("h1");
header.innerHTML = APP_NAME;
app.append(header);

// create canvas
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
canvas.style.cursor = "none";
app.append(canvas);
const ctx = canvas.getContext("2d");
if (!ctx) {
  throw new Error("Failed to get 2d context from canvas");
}
const defaultLineWidth = 4;
let currentLineWidth = defaultLineWidth;
ctx.lineWidth = defaultLineWidth;

// Point and Line types
interface Point {
    x: number;
    y: number;
}
type Line = Point[];

// Structure for a line
interface LineStructure {
    line: Line;
    lineWidth: number;
    drag(point: Point): void;
    display(ctx: CanvasRenderingContext2D): void;
}

// Line class that implements LineStructure
class MarkerLine implements LineStructure {
    line: Line;
    lineWidth: number;

    constructor(point: Point, lineWidth: number) {
        this.line = [point];
        this.lineWidth = lineWidth;
    }
    drag(point: Point) {
        this.line.push(point);
    }
    display(ctx: CanvasRenderingContext2D) {
        ctx.strokeStyle = "black";
        ctx.lineWidth = this.lineWidth;
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

// Structure for a cursor
interface CursorStructure {
    point: Point;
    display(ctx: CanvasRenderingContext2D): void;
}

// Cursor class that implements CursorStructure
class CursorPoint implements CursorStructure {
    point: Point;

    constructor(point: Point) {
        this.point = point;
    }
    display(ctx: CanvasRenderingContext2D): void {
        const tool = toolData.currentTool;
        ctx.font = `${tool.getThickness() * 4}px monospace`;
        ctx.fillText("o", this.point.x - tool.getOffset().x, this.point.y + tool.getOffset().y);
    }
}


// Structure for a tool
interface ToolStructure {
    thickness: number;
    name: string;
    button: HTMLButtonElement;
    offset: Point;
    getButton(): HTMLButtonElement;
    getThickness(): number;
    getOffset(): Point;
}

// Tool class that implements ToolStructure
class SelectedTool implements ToolStructure {
    thickness: number;
    name: string;
    button: HTMLButtonElement;
    offset: Point;

    constructor(thickness: number, name: string, offset: Point) {
        this.thickness = thickness;
        this.name = name;
        this.offset = offset;

        const toolButton = document.createElement("button");
        this.button = toolButton;
        toolButton.innerHTML = name;
        app.append(toolButton);

        toolButton.addEventListener("click", () => {
            currentLineWidth = this.thickness;

            toolData.currentTool.getButton().style.backgroundColor = defButtonColor;
            this.button.style.backgroundColor = selectedButtonColor;
            toolData.currentTool = this;
        });
    }

    getButton(): HTMLButtonElement {
        return this.button;
    }
    getThickness(): number {
        return this.thickness;
    }
    getOffset(): Point {
        return this.offset;
    }
}

// Create global variables
let isDrawing = false;

const lines: MarkerLine[] = [];
const redoLines: MarkerLine[] = [];
let currentLine: MarkerLine | null = null;

let cursorPoint: CursorPoint | null = null;

// Custom events
const drawingChanged: Event = new Event("drawing-changed");
const toolMoved:Event = new Event("tool-moved");

// Add the event listeners for mouse actions
canvas.addEventListener("mousedown", (e) => {
    isDrawing = true;

    currentLine = new MarkerLine({ x: e.offsetX, y: e.offsetY }, currentLineWidth);
    lines.push(currentLine);
    redoLines.splice(0, redoLines.length);
    
    canvas.dispatchEvent(drawingChanged);
  });
  
canvas.addEventListener("mousemove", (e) => {
    cursorPoint = new CursorPoint({ x: e.offsetX, y: e.offsetY });
    canvas.dispatchEvent(toolMoved);
    
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

canvas.addEventListener("mouseout", () => {
    cursorPoint = null;
    canvas.dispatchEvent(toolMoved);
});

canvas.addEventListener("mouseenter", (e) => {
    cursorPoint = new CursorPoint({ x: e.offsetX, y: e.offsetY });
    canvas.dispatchEvent(toolMoved);
});

// Add event listener for drawing-changed event
canvas.addEventListener("drawing-changed", () => {
    redraw(ctx);
});

// Add event listener for tool-moved event
canvas.addEventListener("tool-moved", () => {
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

app.append(document.createElement("br"));

// Create tool buttons
const thinMarker = new SelectedTool(2, "Thin", { x: 2, y: 2 });
const defaultMarker = new SelectedTool(defaultLineWidth, "Default", { x: 5, y: 3 });
const thickMarker = new SelectedTool(8, "Thick", { x: 9, y: 7 });

const defButtonColor = getComputedStyle(document.querySelector("button")!).getPropertyValue("background-color");
const selectedButtonColor = "lightblue";
defaultMarker.getButton().style.backgroundColor = selectedButtonColor;

const toolData = {
    tools: [thinMarker, defaultMarker, thickMarker],
    currentTool: defaultMarker,
};


// ----------------------------- Functions -----------------------------

function redraw(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    lines.forEach((line) => line.display(ctx));

    if (cursorPoint) {
        cursorPoint.display(ctx);
    }
}