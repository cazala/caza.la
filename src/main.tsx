import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Removing index.css import to prevent style conflicts
import App from "./App.tsx";

// Add console log for debugging
console.log("Main script running, mounting App component");

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  console.log("App mounted successfully");
} else {
  console.error("Root element not found");
}
