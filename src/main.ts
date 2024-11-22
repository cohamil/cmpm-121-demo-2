import "./style.css";

const DEFAULT_LINE_WIDTH = 4;
const SLIDER_MIN = 0;
const SLIDER_MAX = 360;
const SLIDER_STEP = 1;
const STICKER_FONT_SIZE = 16;
const DEFAULT_COLOR = "#000000";

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
const context = canvas.getContext("2d");
if (!context) {
  throw new Error("Failed to get 2d context from canvas");
}
let currentLineWidth = DEFAULT_LINE_WIDTH;
let currentColor = DEFAULT_COLOR;
context.lineWidth = DEFAULT_LINE_WIDTH;

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
    color: string;
    drag(point: Point): void;
    display(context: CanvasRenderingContext2D): void;
}

// Line class that implements LineStructure
class MarkerLine implements LineStructure {
    line: Line;
    lineWidth: number;
    color: string;

    constructor(point: Point, lineWidth: number, color: string) {
        this.line = [point];
        this.lineWidth = lineWidth;
        this.color = color;
    }
    drag(point: Point) {
        this.line.push(point);
    }
    display(context: CanvasRenderingContext2D) {
        context.strokeStyle = this.color;
        context.lineWidth = this.lineWidth;
        context.beginPath();
        const point: Point = this.line[0];
        context.moveTo(point.x, point.y);
        for (const point of this.line) {
            context.lineTo(point.x, point.y);
        }
        context.stroke();
        context.closePath();
    }
}

// Structure for a cursor
interface CursorStructure {
    point: Point;
    display(context: CanvasRenderingContext2D): void;
    position(): Point;
}

// Cursor class that implements CursorStructure
class CursorPoint implements CursorStructure {
    point: Point;

    constructor(point: Point) {
        this.point = point;
    }
    display(context: CanvasRenderingContext2D): void {
        if (currentUserState === 'addingSticker') {
            const sticker = stickerData.currentSticker;
            context.font = `${STICKER_FONT_SIZE}px monospace`;

            // rotate sticker according to slider value
            if (sticker) {
                const angle = Number(slider.value);
                const radians = angle * (Math.PI / 180);

                context.save();
                context.translate(this.point.x, this.point.y);
                context.rotate(radians);
                context.fillText(sticker.emoji, 0, 0);
                context.restore();
            }
            return;
        }
        
        const tool = toolData.currentTool;
        if (!tool) return;
        context.fillStyle = currentColor;
        context.font = `${tool.getThickness() * 4}px monospace`;
        context.fillText("o", this.point.x - tool.getOffset().x, this.point.y + tool.getOffset().y);
    }

    position(): Point {
        return this.point;
    }
}

interface BasicToolStructure {
    button: HTMLButtonElement;
    getButton(): HTMLButtonElement;
}
// Structure for a tool
interface MarkerStructure extends BasicToolStructure {
    thickness: number;
    name: string;
    offset: Point;
    getThickness(): number;
    getOffset(): Point;
}

// Tool class that implements ToolStructure
class MarkerTool implements MarkerStructure {
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

            if (toolData.currentTool) toolData.currentTool.getButton().style.backgroundColor = defButtonColor;
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
interface StickerToolStructure extends BasicToolStructure {
    emoji: string;
    getEmoji(): string;
}

// Stickertool class that implements StickerToolStructure
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
    fontSettings: string;
    rotation: number;
    display(context: CanvasRenderingContext2D): void;
}

// Sticker class that implements StickerStructure
class Sticker implements StickerStructure {
    emoji: string;
    position: Point;
    fontSettings: string;
    rotation: number;
    constructor(emoji: string, position: Point, fontSettings: string, rotation: number) {
        this.emoji = emoji;
        this.position = position;
        this.fontSettings = fontSettings;
        this.rotation = rotation;
    }
    display(context: CanvasRenderingContext2D) {
        context.save();
        context.font = this.fontSettings;
        context.translate(this.position.x, this.position.y);
        context.rotate(this.rotation * Math.PI / 180);
        context.fillText(this.emoji, 0, 0);
        context.restore();
    }
}

// Create global variables
type toolState = 'isIdle' | 'isDrawing' | 'addingSticker';
let currentUserState: toolState = 'isIdle';

const commands: (MarkerLine | Sticker)[] = [];
const redoCommands: (MarkerLine | Sticker)[] = [];
let currentCommand: MarkerLine | Sticker | null = null;
let cursorPoint: CursorPoint | null = null;
const stickerSettings = `${STICKER_FONT_SIZE}px monospace`;

// Custom events
const drawingChanged: Event = new Event("drawing-changed");
const toolMoved: Event = new Event("tool-moved");

// Add color picker
app.append(document.createElement("br"));
const colorPicker = document.createElement("input");
colorPicker.type = "color";
colorPicker.value = DEFAULT_COLOR;
app.append(colorPicker);
const colorLabel = document.createElement("span");
colorLabel.innerHTML = " Color";
app.append(colorLabel);
app.append(document.createElement("br"));

colorPicker.addEventListener("input", (event) => {
    currentColor = (event.target as HTMLInputElement).value;
});

// Add the event listeners for mouse actions
canvas.addEventListener("mousedown", (mouseEvent) => {
    if (currentUserState === 'addingSticker') {
        const sticker = stickerData.currentSticker;
        if (sticker) {
            const rotation = Number(slider.value);
            currentCommand = new Sticker(sticker.getEmoji(), { x: mouseEvent.offsetX, y: mouseEvent.offsetY }, stickerSettings, rotation);
        }
    }
    else {
        currentUserState = 'isDrawing';
        currentCommand = new MarkerLine({ x: mouseEvent.offsetX, y: mouseEvent.offsetY }, currentLineWidth, currentColor);
    }
    
    if (currentCommand) commands.push(currentCommand);
    redoCommands.splice(0, redoCommands.length);
    
    canvas.dispatchEvent(drawingChanged);
});

canvas.addEventListener("mousemove", (mouseEvent) => {
    cursorPoint = new CursorPoint({ x: mouseEvent.offsetX, y: mouseEvent.offsetY });
    canvas.dispatchEvent(toolMoved);
    
    if (currentUserState === 'isDrawing') {
        if (currentCommand) {
            const line = currentCommand as MarkerLine;
            line.drag({ x: mouseEvent.offsetX, y: mouseEvent.offsetY });
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

canvas.addEventListener("mouseenter", (mouseEvent) => {
    cursorPoint = new CursorPoint({ x: mouseEvent.offsetX, y: mouseEvent.offsetY });
    canvas.dispatchEvent(toolMoved);
});

canvas.addEventListener("drawing-changed", () => {
    redraw(context);
});

canvas.addEventListener("tool-moved", () => {
    redraw(context);
});

app.append(document.createElement("br"));

// Create export button
const exportButton = document.createElement("button");
exportButton.innerHTML = "Export";
app.append(exportButton);

const canvasScalar = 4;
exportButton.addEventListener("click", () => {
    //create temp canvas
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width * canvasScalar;
    tempCanvas.height = canvas.height * canvasScalar;
    
    // draw on temp canvas
    const tempcontext = tempCanvas.getContext("2d");
    if (tempcontext) {
        tempcontext.scale(canvasScalar, canvasScalar);
        redraw(tempcontext);
    }

    // download temp canvas
    const a = document.createElement("a");
    a.href = tempCanvas.toDataURL("image/png");
    a.download = "sketchpad.png";
    a.click();
});

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
        const command = commands.pop();
        if (command) redoCommands.push(command);
        canvas.dispatchEvent(drawingChanged);
    }
});

// Create redo button
const redoButton = document.createElement("button");
redoButton.innerHTML = "Redo";
app.append(redoButton);

redoButton.addEventListener("click", () => {
    if (redoCommands.length > 0) {
        const command = redoCommands.pop();
        if (command) commands.push(command);
        canvas.dispatchEvent(drawingChanged);
    }
});

app.append(document.createElement("br"));

// Configuration for tools
const toolsConfig = [
    { thickness: 2, name: "Thin", offset: { x: 2, y: 2 } },
    { thickness: 4, name: "Default", offset: { x: 5, y: 3 } },
    { thickness: 8, name: "Thick", offset: { x: 9, y: 7 } },
];

// Configuration for stickers
const stickersConfig = [
    { emoji: "😊" },
    { emoji: "❤️" },
    { emoji: "⭐" },
    { emoji: "🌲" },
    { emoji: "🍇" },
];

// Create tools
const toolData: { tools: MarkerTool[], currentTool: MarkerTool | null } = { tools: [], currentTool: null };
toolsConfig.forEach(({ thickness, name, offset }) => {
  const tool = new MarkerTool(thickness, name, offset);
  toolData.tools.push(tool);
});
toolData.currentTool = toolData.tools[1];  // Default tool

// Select default tool
const defButtonColor = getComputedStyle(document.querySelector("button")!).getPropertyValue("background-color");
const selectedButtonColor = "lightblue";
toolData.currentTool.getButton().style.backgroundColor = selectedButtonColor;

app.append(document.createElement("br"));

// Create stickers
const stickerData: { stickers: StickerTool[], currentSticker: StickerTool | null } = { stickers: [], currentSticker: null };
stickersConfig.forEach(({ emoji }) => {
  const sticker = new StickerTool(emoji);
  stickerData.stickers.push(sticker);
});

app.append(document.createElement("br"));

// Create sticker rotation slider
const slider = document.createElement("input");
slider.type = "range";
slider.min = SLIDER_MIN.toString();
slider.max = SLIDER_MAX.toString();
slider.step = SLIDER_STEP.toString();
slider.value = slider.min;
app.append(slider);
// add text on same line as slider
const sliderText = document.createElement("text");
sliderText.innerHTML = "Sticker Rotation";
app.append(sliderText);

app.append(document.createElement("br"));

// Create custom sticker button
const promptButton = document.createElement("button");
promptButton.innerHTML = "Create Custom Sticker";
app.append(promptButton);

promptButton.addEventListener("click", () => {
    const text = prompt("Custom sticker text", "Insert string/emoji here");
    if (text) {
        const customSticker = new StickerTool(text);
        stickerData.stickers.push(customSticker);
    }
});

app.append(document.createElement("br"));

function redraw(context: CanvasRenderingContext2D) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    commands.forEach((command) => command.display(context));

    if (cursorPoint) {
        cursorPoint.display(context);
    }
}