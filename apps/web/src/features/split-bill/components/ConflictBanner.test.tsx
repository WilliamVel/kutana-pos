import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConflictBanner } from "./ConflictBanner.js";

describe("ConflictBanner", () => {
  it("shows the real non-technical message text, not a status code or stack trace", () => {
    render(
      <ConflictBanner
        message="This bill changed on another device. We refreshed it below — please check the totals and try again."
        onDismiss={vi.fn()}
      />,
    );

    const banner = screen.getByRole("alert");
    expect(banner).toHaveTextContent(
      "This bill changed on another device. We refreshed it below — please check the totals and try again.",
    );
    expect(banner.textContent).not.toMatch(/409|ConflictError|stack|Error:/i);
  });

  it("re-enables the action by calling onDismiss when the acknowledge button is pressed", () => {
    const onDismiss = vi.fn();
    render(<ConflictBanner message="This bill changed — please review." onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole("button", { name: "Got it — try again" }));

    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
