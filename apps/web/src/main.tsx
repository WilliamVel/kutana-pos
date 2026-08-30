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

// THE swap point (design.md "The Milestone-1 -> Milestone-2 Swap"): the
// only line in the whole app that decides which adapter set backs every
// port. `buildHttpPorts()` is a stub until apps/api exists — see
// composition/http.ts.
const ports = import.meta.env.VITE_ADAPTER === "http" ? buildHttpPorts() : buildMockPorts();

createRoot(rootElement).render(
  <StrictMode>
    <PortsProvider value={ports}>
      <App />
    </PortsProvider>
  </StrictMode>,
);
