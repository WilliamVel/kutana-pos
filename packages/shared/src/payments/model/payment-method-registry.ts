/**
 * Payment methods are DATA, not code. There is deliberately no TypeScript
 * enum or union-of-literals for payment methods in the domain: the set of
 * accepted methods is a registry (config/seed data), and the only
 * behavioral variance driven by the domain is `requiresTendered` — whether
 * a method captures a tendered amount and computes change due. Adding a
 * new method (e.g. CREDIT_NOTE) means adding ONE registry row; it never
 * requires touching a domain logic file.
 *
 * `PaymentMethodCode` is a branded string, not a literal union, so the
 * type system does not encode the specific set of methods either.
 */
export type PaymentMethodCode = string & { readonly __brand: "PaymentMethodCode" };

export interface PaymentMethodRegistryEntry {
  readonly code: PaymentMethodCode;
  readonly label: string;
  readonly requiresTendered: boolean;
  readonly active: boolean;
  readonly sortOrder: number;
}

export type PaymentMethodRegistry = readonly PaymentMethodRegistryEntry[];

/** Methods marked inactive, test, fixture or sandbox are never offered to a cashier. */
export function isPaymentMethodDisplayable(entry: PaymentMethodRegistryEntry): boolean {
  const marker = `${entry.code} ${entry.label}`.toLocaleLowerCase();
  return entry.active && !/(test|fixture|sandbox|disabled|prueba)/i.test(marker);
}

export function createPaymentMethodRegistry(
  entries: readonly PaymentMethodRegistryEntry[],
): PaymentMethodRegistry {
  return [...entries];
}

export function findPaymentMethod(
  registry: PaymentMethodRegistry,
  code: PaymentMethodCode,
): PaymentMethodRegistryEntry {
  const entry = registry.find((candidate) => candidate.code === code);
  if (!entry) {
    throw new Error(`Unknown payment method code: ${code}`);
  }
  return entry;
}

export function requiresTendered(
  registry: PaymentMethodRegistry,
  code: PaymentMethodCode,
): boolean {
  return findPaymentMethod(registry, code).requiresTendered;
}
