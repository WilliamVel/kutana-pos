# Tipografía del POS

La interfaz del POS usa **Inter Variable** local como fuente principal. La carga usa `font-display: swap`, por lo que el POS permanece operativo con la pila de respaldo aunque el archivo no esté disponible.

## Archivos y recursos

| Ruta | Propósito |
| --- | --- |
| `apps/web/public/fonts/InterVariable.woff2` | Archivo local variable de Inter, pesos 400–700 |
| `apps/web/public/fonts/Inter-LICENSE.txt` | Licencia de Inter conservada junto al recurso |
| `apps/web/src/styles/global.css` | `@font-face`, pila global, óptica, síntesis y utilidades numéricas |
| `apps/web/index.html` | Precarga del único archivo tipográfico principal |
| `apps/web/src/design-system/molecules/PriceTag.module.css` | Precios con números tabulares y escala base de 16 px |
| `apps/web/src/**` (`*.module.css`) | Pesos normalizados a 400, 500, 600 o 700 |

El logotipo de Kutana no se modifica: continúa siendo un recurso SVG y no recibe reglas de texto.

## Pila y reglas

```css
InterVariable, Inter, ui-sans-serif, system-ui, -apple-system,
BlinkMacSystemFont, "Segoe UI", sans-serif
```

- `font-optical-sizing: auto` está activo.
- `font-synthesis: none` evita negritas simuladas.
- Se usa `font-display: swap` y una única descarga WOFF2 variable.
- El rango Unicode está limitado a Latin, español, puntuación y símbolos monetarios usados por el POS.
- Los números tabulares son opt-in mediante `data-numeric="true"` o `.numeric`; los identificadores pueden añadir `data-identifier="true"` o `.identifier` para `slashed-zero`.

## Escala tipográfica final

| Uso | Tamaño | Peso | Interlineado |
| --- | ---: | ---: | ---: |
| Texto general y formularios | 16 px | 400–500 | 1.45 |
| Productos, mesas y órdenes | 16–18 px | 500 | 1.45 |
| Botones | 16–17 px | 600 | 1.2–1.45 |
| Etiquetas | 15–16 px | 500–600 | 1.45 |
| Información secundaria/metadatos | 14 px | 400–500 | 1.45 |
| Títulos de sección | 20–24 px | 600–700 | 1.2–1.45 |
| Precios y cantidades | 16–18 px | 600 | 1.45 |
| Total de orden | 24–32 px | 700 | 1.2 |

Los textos operativos no usan pesos 100–300 ni negritas fuera de 700. Las etiquetas de estado pueden usar contraste y color además del peso; los nombres de productos, órdenes y botones no se convierten a mayúsculas sostenidas.

## Validación

Ejecutar desde `inventory-system/`:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

La revisión visual debe cubrir 390, 768, 1024 y 1440 px, zoom del 200 %, nombres largos, modificadores, precios, totales, tablas, formularios y botones, incluyendo el funcionamiento con la pila de respaldo.
