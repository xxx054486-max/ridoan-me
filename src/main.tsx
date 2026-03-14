import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("keydown", (e) => {
  if (
    (e.ctrlKey && (e.key === "c" || e.key === "s" || e.key === "u")) ||
    e.key === "F12"
  ) {
    e.preventDefault();
  }
});
document.addEventListener("dragstart", (e) => e.preventDefault());
document.addEventListener("copy", (e) => e.preventDefault());

createRoot(document.getElementById("root")!).render(<App />);
