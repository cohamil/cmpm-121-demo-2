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

