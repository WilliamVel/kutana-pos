import { SHARED_PACKAGE_NAME } from "@kutana/shared";

/**
 * Placeholder root component. Real screens are built starting PR6.
 * This proves apps/web can import from the shared domain package.
 */
export function App(): JSX.Element {
  return (
    <main>
      <h1>KUTANA POS</h1>
      <p>Domain package in use: {SHARED_PACKAGE_NAME}</p>
    </main>
  );
}
