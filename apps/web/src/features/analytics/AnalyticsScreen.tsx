import { useEffect, useState } from "react";
import type { AnalyticsSnapshot } from "@kutana/shared/analytics/model/analytics.js";
import { useAnalytics } from "../../composition/PortsProvider.js";
import { Button } from "../../design-system/atoms/Button.js";
import { Input } from "../../design-system/atoms/Input.js";
import { Panel } from "../../design-system/molecules/Panel.js";
import styles from "./AnalyticsScreen.module.css";

const empty: AnalyticsSnapshot = {
  dailySales: [],
  productMix: [],
  paymentMix: [],
  pendingExposure: [],
};

const money = (cents: number, currencyCode: string): string =>
  new Intl.NumberFormat("es", { style: "currency", currency: currencyCode }).format(cents / 100);

export function AnalyticsScreen(): JSX.Element {
  const analytics = useAnalytics();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<AnalyticsSnapshot>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const range = { from: from || undefined, to: to || undefined };
    setLoading(true);
    setError(null);

    void Promise.all([
      analytics.dailySales(range),
      analytics.productMix(range),
      analytics.paymentMix(range),
      analytics.pendingExposure(range),
    ])
      .then(([dailySales, productMix, paymentMix, pendingExposure]) => {
        if (active) {
          setData({ dailySales, productMix, paymentMix, pendingExposure });
        }
      })
      .catch(() => {
        if (active) {
          setError("No se pudo cargar la analítica.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [analytics, from, to]);

  const pendingTotal = data.pendingExposure.reduce((sum, row) => sum + row.pendingCents, 0);
  return (
    <div className={styles.screen}>
      <header>
        <p className={styles.eyebrow}>Administración</p>
        <h2>Analítica de ventas</h2>
        <p>Entendé el rendimiento del negocio y la exposición pendiente.</p>
      </header>
      <section className={styles.filters} aria-label="Filtros de fechas">
        <Input label="Desde" type="text" value={from} onChange={setFrom} placeholder="AAAA-MM-DD" />
        <Input label="Hasta" type="text" value={to} onChange={setTo} placeholder="AAAA-MM-DD" />
        <Button
          variant="secondary"
          onClick={() => {
            setFrom("");
            setTo("");
          }}
        >
          Limpiar filtros
        </Button>
      </section>
      {loading ? <p role="status">Cargando analítica…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {!loading && !error ? (
        <div className={styles.grid}>
          <Panel title="Ventas por día">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.dailySales.map((row) => (
                  <tr key={`${row.date}-${row.currencyCode}`}>
                    <td>{row.date}</td>
                    <td>{money(row.totalCents, row.currencyCode)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <Panel title="Mix de productos">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Unidades</th>
                  <th>Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {data.productMix.map((row) => (
                  <tr key={row.productId}>
                    <td>{row.name}</td>
                    <td>{row.quantity}</td>
                    <td>{money(row.revenueCents, row.currencyCode)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <Panel title="Mix de pagos">
            <table>
              <thead>
                <tr>
                  <th>Método</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.paymentMix.map((row) => (
                  <tr key={`${row.methodCode}-${row.currencyCode}`}>
                    <td>{row.methodCode}</td>
                    <td>{money(row.amountCents, row.currencyCode)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <Panel title="Exposición pendiente">
            <strong className={styles.total}>
              {money(pendingTotal, data.pendingExposure[0]?.currencyCode ?? "USD")}
            </strong>
            <p>{data.pendingExposure.length} cuenta(s) con saldo pendiente.</p>
            {data.pendingExposure.map((row) => (
              <div className={styles.exposure} key={`${row.customerId ?? "free"}-${row.accountId}`}>
                <span>
                  {row.customerId ? `Cliente ${row.customerId}` : "Sin cliente vinculado"}
                </span>
                <strong>{money(row.pendingCents, row.currencyCode)}</strong>
              </div>
            ))}
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
