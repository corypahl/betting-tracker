import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Tracker } from "../app/Tracker";
import "../app/globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing application root");
}

createRoot(root).render(
  <StrictMode>
    <Tracker />
  </StrictMode>,
);
