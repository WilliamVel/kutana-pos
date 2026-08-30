import { createCategory } from "@kutana/shared/catalog/model/category.js";
import { describe, expect, it } from "vitest";
import { MockCategoryRepository } from "./category-repository.js";

describe("MockCategoryRepository", () => {
  it("lists every saved category", async () => {
    const repository = new MockCategoryRepository();
    await repository.save(createCategory({ id: "cat-1", name: "Draft Beer", sortOrder: 1 }));
    await repository.save(createCategory({ id: "cat-2", name: "Food", sortOrder: 2 }));

    const categories = await repository.listAll();

    expect(categories.map((category) => category.name).sort()).toEqual(["Draft Beer", "Food"]);
  });

  it("finds a category by id, or returns null when absent", async () => {
    const repository = new MockCategoryRepository();
    await repository.save(createCategory({ id: "cat-1", name: "Draft Beer", sortOrder: 1 }));

    await expect(repository.findById("cat-1")).resolves.toMatchObject({ name: "Draft Beer" });
    await expect(repository.findById("missing")).resolves.toBeNull();
  });
});
