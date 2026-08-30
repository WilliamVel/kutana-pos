import { useState } from "react";
import { Button } from "../../../design-system/atoms/Button.js";
import { PriceTag } from "../../../design-system/molecules/PriceTag.js";
import styles from "./AddItemPanel.module.css";

export interface AddItemPanelProduct {
  readonly id: string;
  readonly name: string;
  /** Integer cents. */
  readonly priceCents: number;
  readonly categoryName: string;
}

export interface AddItemPanelProps {
  readonly products: readonly AddItemPanelProduct[];
  readonly onAdd: (productId: string, quantity: number) => void;
  /** True when the order is paid / can no longer be modified. */
  readonly disabled?: boolean;
  readonly conflictMessage?: string | null;
  readonly onDismissConflict?: () => void;
}

/**
 * Purely presentational: props in, markup out, no port access. Lists the
 * catalog grouped by category so a server can add products to an open
 * order; each row has a small quantity stepper and an "Add" action.
 */
export function AddItemPanel({
  products,
  onAdd,
  disabled = false,
  conflictMessage,
  onDismissConflict,
}: AddItemPanelProps): JSX.Element {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const quantityFor = (id: string): number => quantities[id] ?? 1;
  const setQuantity = (id: string, value: number): void =>
    setQuantities((current) => ({ ...current, [id]: Math.max(1, value) }));

  const groups = new Map<string, AddItemPanelProduct[]>();
  for (const product of products) {
    const list = groups.get(product.categoryName) ?? [];
    list.push(product);
    groups.set(product.categoryName, list);
  }

  return (
    <section className={styles.panel} aria-label="Add items to order">
      <h2>Add items</h2>

      {conflictMessage ? (
        <div className={styles.conflict} role="alert">
          <p>{conflictMessage}</p>
          {onDismissConflict ? (
            <Button variant="secondary" onClick={onDismissConflict}>
              Got it — try again
            </Button>
          ) : null}
        </div>
      ) : null}

      {[...groups.entries()].map(([categoryName, items]) => (
        <div key={categoryName} className={styles.group}>
          <h3 className={styles.groupHeading}>{categoryName}</h3>
          <ul className={styles.rows}>
            {items.map((product) => (
              <li key={product.id} className={styles.row}>
                <span className={styles.name}>{product.name}</span>
                <PriceTag cents={product.priceCents} />
                <div className={styles.stepper}>
                  <button
                    type="button"
                    className={styles.stepperButton}
                    aria-label={`Decrease quantity of ${product.name}`}
                    disabled={disabled || quantityFor(product.id) <= 1}
                    onClick={() => setQuantity(product.id, quantityFor(product.id) - 1)}
                  >
                    −
                  </button>
                  <span className={styles.quantity} aria-label={`Quantity of ${product.name}`}>
                    {quantityFor(product.id)}
                  </span>
                  <button
                    type="button"
                    className={styles.stepperButton}
                    aria-label={`Increase quantity of ${product.name}`}
                    disabled={disabled}
                    onClick={() => setQuantity(product.id, quantityFor(product.id) + 1)}
                  >
                    +
                  </button>
                </div>
                <Button
                  onClick={() => onAdd(product.id, quantityFor(product.id))}
                  disabled={disabled}
                >
                  Add
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
