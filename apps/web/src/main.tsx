import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./design-system/tokens/palette.css";
import "./design-system/tokens/elevation.css";
import "./styles/global.css";
import { App } from "./App.js";
import { PortsProvider } from "./composition/PortsProvider.js";
import { buildHttpPorts } from "./composition/http.js";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

// Runtime data comes from apps/api/Postgres. Mock ports are reserved for tests
// and are not selectable in the production/dev app bundle.
const ports = buildHttpPorts();

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <PortsProvider value={ports}>
        <App />
      </PortsProvider>
    </BrowserRouter>
  </StrictMode>,
);
