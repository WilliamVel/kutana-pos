import { act, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { describe, expect, it } from "vitest";
import { AppShell } from "./AppShell.js";
import styles from "./AppShell.module.css";

describe("AppShell", () => {
  it("renders the top bar and children slots", () => {
    render(
      <AppShell topBar={<div>top-slot</div>}>
        <p>screen content</p>
      </AppShell>,
    );

    expect(screen.getByText("top-slot")).toBeInTheDocument();
    expect(screen.getByText("screen content")).toBeInTheDocument();
  });

  it("omits the action bar slot when no actionBar prop is given", () => {
    render(
      <AppShell topBar={<div>top</div>}>
        <p>content</p>
      </AppShell>,
    );

    expect(screen.queryByText("action-slot")).not.toBeInTheDocument();
  });

  it("renders the action bar slot when provided", () => {
    render(
      <AppShell topBar={<div>top</div>} actionBar={<div>action-slot</div>}>
        <p>content</p>
      </AppShell>,
    );

    expect(screen.getByText("action-slot")).toBeInTheDocument();
  });

  it("mounts one accessible toast region below the navigation", async () => {
    render(
      <AppShell topBar={<div>top</div>}>
        <p>content</p>
      </AppShell>,
    );

    const region = screen.getByRole("region", { name: /Avisos del POS/ });
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(styles.toaster).toBeDefined();
    const id = "shell-toast-test";
    try {
      act(() => { toast.success("Test toast", { id }); });
      await waitFor(() => expect(document.querySelector("[data-sonner-toaster]"))
        .toHaveClass(styles.toaster!));
    } finally {
      act(() => { toast.dismiss(id); });
    }
  });
});
