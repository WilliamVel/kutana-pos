export interface VisualOrderLine {
  readonly productId?: string;
  readonly pourSizeMl?: number | null;
  readonly isAdjustment?: boolean;
}

export interface VisualProductMetadata {
  readonly categoryName?: string;
  readonly stockKind?: "unit" | "volume";
  readonly pourSizeMl?: number | null;
}

export type VisualOrderGroup = "beverages" | "food" | "adjustments";

export interface VisualOrderSection<T extends VisualOrderLine = VisualOrderLine> {
  readonly group: VisualOrderGroup;
  readonly label: "Bebidas" | "Comida" | "Ajustes";
  readonly lines: readonly T[];
}

const POUR_ORDER = new Map<number, number>([
  [330, 0],
  [500, 1],
  [750, 2],
  [1000, 3],
]);

function normalizedCategory(categoryName: string | undefined): string {
  return categoryName?.trim().toLocaleLowerCase() ?? "";
}

function categoryIsGaseosas(categoryName: string | undefined): boolean {
  return normalizedCategory(categoryName) === "gaseosas";
}

function categoryIsFood(categoryName: string | undefined): boolean {
  const category = normalizedCategory(categoryName);
  return category === "comida" || category === "food";
}

function categoryIsBeverage(categoryName: string | undefined): boolean {
  const category = normalizedCategory(categoryName);
  return /(?:bebida|beverage|cerveza|beer|vino|wine)/.test(category);
}

function regularGroup<T extends VisualOrderLine>(
  line: T,
  metadata: VisualProductMetadata | undefined,
): "pour-330" | "pour-500" | "pour-750" | "pour-1000" | "gaseosas" | "other-beverage" | "food" {
  if (categoryIsGaseosas(metadata?.categoryName)) return "gaseosas";
  if (categoryIsFood(metadata?.categoryName)) return "food";
  const beverageLike =
    categoryIsBeverage(metadata?.categoryName) ||
    metadata?.stockKind === "volume" ||
    line.pourSizeMl != null ||
    (metadata?.pourSizeMl !== null && metadata?.pourSizeMl !== undefined);
  if (!beverageLike) return "food";
  const pourOrder = POUR_ORDER.get(line.pourSizeMl ?? metadata?.pourSizeMl ?? -1);
  if (pourOrder === 0) return "pour-330";
  if (pourOrder === 1) return "pour-500";
  if (pourOrder === 2) return "pour-750";
  if (pourOrder === 3) return "pour-1000";
  return "other-beverage";
}

/** Orders visible rows without changing persisted lines or allocation mappings. */
export function orderTicketLines<T extends VisualOrderLine>(
  lines: readonly T[],
  metadataByProductId: ReadonlyMap<string, VisualProductMetadata> = new Map(),
): T[] {
  const groups = new Map<string, T[]>();
  const keys = [
    "pour-330",
    "pour-500",
    "pour-750",
    "pour-1000",
    "gaseosas",
    "other-beverage",
    "food",
    "adjustments",
  ] as const;
  for (const key of keys) groups.set(key, []);

  for (const line of lines) {
    if (line.isAdjustment) groups.get("adjustments")!.push(line);
    else
      groups
        .get(
          regularGroup(line, line.productId ? metadataByProductId.get(line.productId) : undefined),
        )!
        .push(line);
  }

  return keys.flatMap((key) => groups.get(key)!);
}

export function sectionizeOrderTicketLines<T extends VisualOrderLine>(
  lines: readonly T[],
  metadataByProductId: ReadonlyMap<string, VisualProductMetadata> = new Map(),
): VisualOrderSection<T>[] {
  const sections: VisualOrderSection<T>[] = [];
  const add = (group: VisualOrderGroup, label: VisualOrderSection<T>["label"], values: T[]) => {
    if (values.length > 0) sections.push({ group, label, lines: values });
  };
  const ordered = orderTicketLines(lines, metadataByProductId);
  const adjustments = ordered.filter((line) => line.isAdjustment);
  const regular = ordered.filter((line) => !line.isAdjustment);
  const beverages = regular.filter((line) => {
    const metadata = line.productId ? metadataByProductId.get(line.productId) : undefined;
    return regularGroup(line, metadata) !== "food";
  });
  add("beverages", "Bebidas", beverages);
  add(
    "food",
    "Comida",
    regular.filter((line) => !beverages.includes(line)),
  );
  add("adjustments", "Ajustes", adjustments);
  return sections;
}
