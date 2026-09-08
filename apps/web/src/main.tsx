import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./design-system/tokens/palette.css";
import "./design-system/tokens/elevation.css";
import "./styles/global.css";
import { App } from "./App.js";
import { PortsProvider } from "./composition/PortsProvider.js";
import { buildHttpPorts } from "./composition/http.js";
import { buildMockPorts } from "./composition/mock.js";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

// THE swap point: HTTP is the default runtime because catalog/auth/order data
// now lives behind apps/api. Use VITE_ADAPTER=mock only for isolated local UI
// demos/tests that intentionally avoid the backend.
const ports = import.meta.env.VITE_ADAPTER === "mock" ? buildMockPorts() : buildHttpPorts();

createRoot(rootElement).render(
  <StrictMode>
    <PortsProvider value={ports}>
      <App />
    </PortsProvider>
  </StrictMode>,
);
