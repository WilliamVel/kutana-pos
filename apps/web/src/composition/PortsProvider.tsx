import { createContext, useContext, type ReactNode } from "react";
import type { Ports } from "./ports.js";

/**
 * The composition-root React context. `undefined` as the default value is
 * intentional: it lets `usePorts()` distinguish "no provider mounted" from
 * "a provider mounted with a legitimately empty value", which is not a
 * shape `Ports` can otherwise take.
 */
const PortsContext = createContext<Ports | undefined>(undefined);

export interface PortsProviderProps {
  readonly value: Ports;
  readonly children: ReactNode;
}

/**
 * The single place a `Ports` object is made available to the component
 * tree. `main.tsx` is the only caller that decides WHICH `Ports` (mock vs.
 * HTTP) — every feature container below this provider consumes ports only
 * through `usePorts()` / the per-port hooks, never through a direct
 * adapter import.
 */
export function PortsProvider({ value, children }: PortsProviderProps): JSX.Element {
  return <PortsContext.Provider value={value}>{children}</PortsContext.Provider>;
}

/**
 * Base hook. Prefer the per-port hooks below in feature code — they are
 * more specific about what a component actually depends on — but `usePorts`
 * remains available for code that legitimately needs several ports at once.
 */
export function usePorts(): Ports {
  const ports = useContext(PortsContext);
  if (!ports) {
    throw new Error(
      "usePorts() was called outside a <PortsProvider>. Wrap the component tree " +
        "with <PortsProvider value={buildMockPorts() /* or buildHttpPorts() */}>.",
    );
  }
  return ports;
}

export function useOrders(): Ports["orders"] {
  return usePorts().orders;
}

export function useTickets(): Ports["tickets"] {
  return usePorts().tickets;
}

export function usePayments(): Ports["payments"] {
  return usePorts().payments;
}

export function useProducts(): Ports["products"] {
  return usePorts().products;
}

export function useStock(): Ports["stock"] {
  return usePorts().stock;
}

export function usePaymentMethods(): Ports["methods"] {
  return usePorts().methods;
}

export function useOrderEvents(): Ports["events"] {
  return usePorts().events;
}
