/**
 * Money value object over integer cents.
 *
 * All monetary values in the domain MUST be represented as integer cents.
 * Float arithmetic is never valid here: `0.1 + 0.2 !== 0.3` in IEEE-754, and
 * that error compounds silently across an entire register's worth of sales.
 * `Money` closes that door at the type boundary by rejecting any non-integer
 * input outright.
 */
export class Money {
  private constructor(private readonly _cents: number) {}

  get cents(): number {
    return this._cents;
  }

  static fromCents(cents: number): Money {
    if (!Number.isInteger(cents)) {
      throw new Error(`Money.fromCents requires an integer number of cents, received: ${cents}`);
    }
    if (cents < 0) {
      throw new Error(
        `Money.fromCents requires a non-negative amount, received a negative value: ${cents}`,
      );
    }
    return new Money(cents);
  }

  static zero(): Money {
    return new Money(0);
  }

  add(other: Money): Money {
    return Money.fromCents(this._cents + other._cents);
  }

  subtract(other: Money): Money {
    const result = this._cents - other._cents;
    if (result < 0) {
      throw new Error(
        `Money.subtract would produce a negative result: ${this._cents} - ${other._cents} = ${result}`,
      );
    }
    return Money.fromCents(result);
  }

  multiply(quantity: number): Money {
    if (!Number.isInteger(quantity)) {
      throw new Error(`Money.multiply requires an integer quantity, received: ${quantity}`);
    }
    return Money.fromCents(this._cents * quantity);
  }

  equals(other: Money): boolean {
    return this._cents === other._cents;
  }
}
