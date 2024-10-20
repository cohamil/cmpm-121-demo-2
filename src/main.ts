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
    position(): Point;
}

// Cursor class that implements CursorStructure
class CursorPoint implements CursorStructure {
    point: Point;

    constructor(point: Point) {
        this.point = point;
    }
    display(ctx: CanvasRenderingContext2D): void {
        if (currentUserState === 'addingSticker') {
            const sticker = stickerData.currentSticker;
            if (sticker) ctx.fillText(sticker.emoji, this.point.x, this.point.y);
            
            return;
        }
        
        const tool = toolData.currentTool;
        ctx.font = `${tool.getThickness() * 4}px monospace`;
        ctx.fillText("o", this.point.x - tool.getOffset().x, this.point.y + tool.getOffset().y);
    }

    position(): Point {
        return this.point;
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

// Structure for a sticker
interface StickerToolStructure {
    emoji: string;
    button: HTMLButtonElement;
    getButton(): HTMLButtonElement;
    getEmoji(): string;
}

class StickerTool implements StickerToolStructure {
    emoji: string;
    button: HTMLButtonElement;

    constructor(emoji: string) {
        this.emoji = emoji;

        const stickerButton = document.createElement("button");
        this.button = stickerButton;
        stickerButton.innerHTML = emoji;
        app.append(stickerButton);

        stickerButton.addEventListener("click", () => {
            if (stickerData.currentSticker === this) {
                currentUserState = 'isIdle';
                this.button.style.backgroundColor = defButtonColor;
                stickerData.currentSticker = null;
                return;
            }
            
            currentUserState = 'addingSticker';

            const curSticker = stickerData.currentSticker;
            if (curSticker) curSticker.getButton().style.backgroundColor = defButtonColor;
            this.button.style.backgroundColor = selectedButtonColor;
            stickerData.currentSticker = this;
        });
    }

    // display(ctx: CanvasRenderingContext2D): void {
    //     if (cursorPoint) ctx.fillText(this.emoji, cursorPoint.position().x, cursorPoint.position().y);
    // }

    getButton(): HTMLButtonElement {
        return this.button;
    }
    getEmoji(): string {  
        return this.emoji;
    }
}

// Structure for a sticker
interface StickerStructure {
    emoji: string;
    position: Point;
    display(ctx: CanvasRenderingContext2D): void;
}

// Sticker class that implements StickerStructure
class Sticker implements StickerStructure {
    emoji: string;
    position: Point;
    constructor(emoji: string, position: Point) {
        this.emoji = emoji;
        this.position = position;
    }
    display(ctx: CanvasRenderingContext2D) {
        ctx.font = "16px monospace";
        ctx.fillText(this.emoji, this.position.x, this.position.y);
    }
}


// Create global variables
type toolState = 'isIdle' | 'isDrawing' | 'addingSticker';
let currentUserState: toolState = 'isIdle';

const commands: (MarkerLine | Sticker)[] = [];
const redoCommands: (MarkerLine | Sticker)[] = [];
let currentCommand: MarkerLine | Sticker | null = null;

let cursorPoint: CursorPoint | null = null;

// Custom events
const drawingChanged: Event = new Event("drawing-changed");
const toolMoved:Event = new Event("tool-moved");

// Add the event listeners for mouse actions
canvas.addEventListener("mousedown", (e) => {
    if (currentUserState === 'addingSticker') {
        const s = stickerData.currentSticker;
        if (s) currentCommand = new Sticker(s.getEmoji(), { x: e.offsetX, y: e.offsetY });
    }
    else {
        currentUserState = 'isDrawing';
        currentCommand = new MarkerLine({ x: e.offsetX, y: e.offsetY }, currentLineWidth);
    }
    
    if (currentCommand) commands.push(currentCommand);
    redoCommands.splice(0, redoCommands.length);
    
    canvas.dispatchEvent(drawingChanged);
  });
  
canvas.addEventListener("mousemove", (e) => {
    cursorPoint = new CursorPoint({ x: e.offsetX, y: e.offsetY });
    canvas.dispatchEvent(toolMoved);
    
    if (currentUserState === 'isDrawing') {
        if (currentCommand) {
            const line  = currentCommand as MarkerLine;
            line.drag({ x: e.offsetX, y: e.offsetY });
        }

        canvas.dispatchEvent(drawingChanged);
    }
});
  
canvas.addEventListener("mouseup", () => {
    if (currentUserState === 'isDrawing') {
        currentUserState = 'isIdle';

        currentCommand = null;

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
    commands.splice(0, commands.length);
    canvas.dispatchEvent(drawingChanged);
});

// Create undo button
const undoButton = document.createElement("button");
undoButton.innerHTML = "Undo";
app.append(undoButton);

undoButton.addEventListener("click", () => {
    if (commands.length > 0) {
        const cmd = commands.pop();
        if (cmd) redoCommands.push(cmd);
        
        canvas.dispatchEvent(drawingChanged);
    }
});

// Create redo button
const redoButton = document.createElement("button");
redoButton.innerHTML = "Redo";
app.append(redoButton);

redoButton.addEventListener("click", () => {
    if (redoCommands.length > 0) {
        const cmd = redoCommands.pop();
        if (cmd) commands.push(cmd);

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

app.append(document.createElement("br"));

// Create sticker buttons
const smileySticker = new StickerTool("😊");
const heartSticker = new StickerTool("❤️");
const starSticker = new StickerTool("⭐");

const stickerData = {
    stickers: [smileySticker, heartSticker, starSticker],
    currentSticker: null as StickerTool | null,
}

// ----------------------------- Functions -----------------------------

function redraw(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    commands.forEach((cmd) => cmd.display(ctx));

    if (cursorPoint) {
        cursorPoint.display(ctx);
    }
}