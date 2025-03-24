import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Database from "./Database/firebase.config.js";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
