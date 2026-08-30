export interface Category {
  readonly id: string;
  readonly name: string;
  readonly sortOrder: number;
}

export function createCategory(input: { name: string; sortOrder: number; id?: string }): Category {
  return {
    id: input.id ?? crypto.randomUUID(),
    name: input.name,
    sortOrder: input.sortOrder,
  };
}
