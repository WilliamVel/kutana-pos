# Investigación de producto y arquitectura de datos: Analítica de ventas

## Resumen ejecutivo

La pantalla actual es un reporte de **ventas cerradas** compuesto por cuatro agregados independientes: ventas por día, mix de productos, mix de pagos y pendiente registrado al cierre. Las cifras provienen de snapshots inmutables, pero responden preguntas distintas y no deberían interpretarse como una única conciliación de caja.

Antes de rediseñar la interfaz conviene resolver cuatro problemas:

1. Definir zona horaria, fecha comercial y significado de “ticket”.
2. Separar claramente importe vendido, cobrado al cierre y saldo pendiente vigente.
3. Corregir el cierre de cuentas pendientes parcialmente pagadas.
4. Ampliar el snapshot de producto si se quieren categorías históricas, producto base, litros o margen confiables.

No se modificó código durante la investigación original. Los datos de volumen y calidad incluidos en este documento corresponden únicamente a la base PostgreSQL local inspeccionada; no se tuvo acceso a producción ni se exponen datos personales.

## Alcance y evidencia

- Repositorio inspeccionado: `inventory-system/`.
- Rama y revisión durante la investigación: `main`, commit `0c41be0`.
- Árbol de trabajo limpio al momento de inspeccionarlo.
- Se consultaron únicamente agregados no personales de la base local.
- Verificación: 6 archivos de prueba y 18 pruebas distintas pasaron sin fallos.
- No hubo acceso a una base de producción.

---

# Mapa del flujo de datos

## Entrada y navegación

No existe una ruta URL específica. La aplicación usa un identificador interno de pantalla.

1. `analytics` está registrado como pantalla exclusiva de administradores:
   - `apps/web/src/app-shell/screens.ts:4-31`
2. `App` monta `AnalyticsScreen` cuando la pantalla activa es `analytics`:
   - `apps/web/src/App.tsx:258`
3. La API exige rol `admin` para los cuatro endpoints:
   - `apps/api/src/billing/billing-core.controller.ts:68-93`

## Flujo completo

```text
AnalyticsScreen
  → AnalyticsReadPort
  → HttpAnalyticsService
  → GET /billing/analytics/*
  → BillingCoreController
  → SalesAnalyticsService
  → sales / sale_items / sale_settlements
```

| Capa | Archivo | Responsabilidad |
|---|---|---|
| Interfaz | `apps/web/src/features/analytics/AnalyticsScreen.tsx:19-159` | Filtros, cuatro solicitudes, tablas y total pendiente |
| Contrato compartido | `packages/shared/src/analytics/model/analytics.ts:1-43` | DTO de métricas |
| Puerto | `packages/shared/src/analytics/ports/analytics-service.ts:1-16` | Interfaz de lectura |
| Adaptador HTTP | `apps/web/src/adapters/http/analytics-service.ts:11-42` | Construcción de las cuatro URLs |
| Controlador | `apps/api/src/billing/billing-core.controller.ts:68-93` | Autorización y delegación |
| Consultas | `apps/api/src/billing/sales-analytics.service.ts:52-148` | Validación de fechas y SQL |
| Historia persistida | `apps/api/migrations/016_payment_closure_sales_history.sql:2-58` | `sales`, `sale_items`, `sale_settlements` |
| Creación de historia | `apps/api/src/billing/payment-closure.service.ts:25-128` | Cierre atómico y snapshots |
| Reconciliación | `packages/shared/src/billing/services/sale-snapshot.ts:43-78` | Totales, cobrado y pendiente |

`AnalyticsScreen` dispara las cuatro solicitudes en paralelo cada vez que cambia un carácter de `Desde` o `Hasta`:

- `apps/web/src/features/analytics/AnalyticsScreen.tsx:27-58`

No hay botón “Aplicar”, debounce, paginación ni límite máximo de período.

## Endpoints actuales

- `GET /billing/analytics/daily-sales`
- `GET /billing/analytics/product-mix`
- `GET /billing/analytics/payment-mix`
- `GET /billing/analytics/pending-exposure`

## Fuentes relacionadas que hoy no usa Analítica

### Cuentas por cobrar actuales

- Endpoint paginado: `GET /billing/customer-debts/pending`
- Consulta: `apps/api/src/billing/adapters/postgres/customer-debt-repository.ts:65-145`
- Pantalla: `apps/web/src/features/pending-debts/`
- Incluye saldo identificado, saldo sin cliente, débitos, pagos, actividad y cantidad de cuentas.
- Tiene paginación de 20 filas y máximo servidor de 100.

Esta fuente representa mejor el **saldo vigente** que `pendingExposure`, que conserva el pendiente al momento del cierre.

### Catálogo

- Categorías, productos activos/inactivos, SKU, precio, coste, impuesto, tipo de stock, tamaño y `stock_item_id`.
- `apps/api/src/catalog/catalog-inventory.controller.ts:24-88`
- `apps/api/src/catalog/adapters/postgres/product-repository.ts:1-113`

### Inventario

- Stock actual y movimientos por artículo.
- `apps/api/src/inventory/adapters/postgres/stock-repository.ts:51-121`
- Campos: unidad `ea` o `ml`, cantidad, umbral, movimiento, razón, referencia y fecha.

### Pagos y métodos

- Métodos con código y etiqueta: `GET /payments/methods`
- Pagos por cuenta, deuda o ticket: `GET /payments`
- `apps/api/src/payments/payments.controller.ts:20-71`

La pantalla actual devuelve códigos internos y no consulta las etiquetas.

---

# Inventario de métricas

| Métrica | Pregunta de negocio | Fórmula real | Origen | Disponibilidad | Confiabilidad | Advertencias |
|---|---|---|---|---|---|---|
| Ventas por día | ¿Cuánto se vendió cada día? | `SUM(sales.total_cents)` por `completed_at::date` y moneda | `sales` | Actual | Alta para ventas cerradas | Incluye impuesto y pendiente; no equivale a efectivo cobrado |
| Total del período | ¿Cuánto se vendió? | Suma de ventas diarias | `sales.total_cents` | Derivable | Alta | La UI no lo muestra |
| Cantidad de tickets comerciales | ¿Cuántas operaciones se cerraron? | `COUNT(sales)` | `sales` | Derivable | Alta si “ticket” significa orden cerrada | Una orden puede tener varios registros `tickets`; falta la definición comercial |
| Ticket promedio | ¿Cuál fue el gasto medio? | `SUM(total_cents) / COUNT(sales)` | `sales` | Derivable | Alta | Depende de definir ticket como venta/orden |
| Subtotal neto de impuesto | ¿Cuánto se vendió antes de impuestos? | `SUM(subtotal_cents)` | `sales` | Derivable | Alta | No expuesto |
| Impuestos | ¿Cuánto corresponde a impuestos? | `SUM(tax_total_cents)` | `sales` | Derivable | Alta | No hay desglose por tasa |
| Descuentos | ¿Cuánto se descontó? | `SUM(discount_total_cents)` | `sales` | Derivable técnicamente | Baja utilidad actual | El cierre escribe siempre cero |
| Unidades por producto/presentación | ¿Qué presentación se vendió más? | `SUM(sale_items.quantity)` por producto, nombre y moneda | `sale_items` | Actual | Alta | “Unidad” no significa litro; una jarra de 1 L cuenta como una unidad |
| Ingreso por producto | ¿Qué producto genera más facturación? | `SUM(sale_items.total_cents)` | `sale_items` | Actual | Alta | Incluye impuesto; ordenado por ID, no por ingreso |
| Precio medio realizado | ¿A qué precio promedio se vendió? | `SUM(total_cents) / SUM(quantity)` | `sale_items` | Derivable | Media/alta | Debe aclararse si se quiere bruto o sin impuesto |
| Mix por categoría | ¿Qué categorías venden más? | Agrupar ventas por categoría | `sale_items` + catálogo actual | Derivable con cautela | Baja históricamente | La categoría no se guarda en el snapshot; cambios posteriores alteran la lectura |
| Mix por producto base | ¿Qué cerveza base vende más entre todos sus tamaños? | Agrupar presentaciones bajo una identidad común | No hay identidad persistida suficiente | No disponible confiablemente | Baja | `stock_item_id` es nullable y no se copia en la venta |
| Litros vendidos | ¿Qué volumen real se sirvió? | `SUM(quantity × pour_size_ml) / 1000` | `line_items` cerradas | Derivable con cautela | Media | `pour_size_ml` no existe en `sale_items`; depende de retener las líneas operativas |
| Cobrado al cierre | ¿Cuánto se cobró al cerrar ventas? | `SUM(sale_settlements.amount_cents)` o `SUM(sales.paid_cents)` | `sale_settlements`, `sales` | Derivable | Alta en snapshots reconciliados | No debe sumarse a ventas como ingreso adicional |
| Mix de cobros | ¿Qué medios se usaron? | `SUM(sale_settlements.amount_cents)` por código | `sale_settlements` | Actual | Alta | Muestra código interno, no etiqueta |
| Pendiente originado al cierre | ¿Cuánto quedó pendiente cuando se cerró? | `SUM(sales.pending_cents)` | `sales` | Actual | Media | Es histórico e inmutable, no saldo vigente |
| Saldo pendiente vigente | ¿Cuánto queda por cobrar hoy? | Débitos menos créditos + cuentas pendientes sin cliente | Ledger y cuentas operativas | Derivable en otro endpoint | Alta para operación | No está integrado en Analítica |
| Ventas por horario | ¿En qué horas se vende más? | Agrupar `completed_at` por hora comercial | `sales` | Derivable | Media | Falta definir zona horaria y si usar apertura o cierre |
| Duración de atención | ¿Cuánto tarda una mesa en cerrarse? | `closed_at - opened_at` | `sales` | Derivable | Media/alta | No mide tiempos intermedios |
| Valor de cuentas abiertas | ¿Cuánto está consumido pero aún no cerrado? | Líneas asignadas menos pagos en órdenes abiertas | Órdenes, cuentas y pagos | Derivable operacionalmente | Media | Debe mantenerse separado de ventas cerradas |
| Coste y margen | ¿Qué margen deja cada producto? | Venta menos coste histórico | Catálogo actual + ventas | No disponible confiablemente | Baja | El coste no se congela en la venta |
| Propinas | ¿Cuánto se recibió en propinas? | — | Sin campos | No disponible | — | Excluidas explícitamente del modelo |
| Devoluciones/reembolsos | ¿Cuánto se devolvió? | — | Sin hechos de ajuste | No disponible | — | Reembolsos explícitamente no soportados |
| Anulaciones | ¿Qué se anuló y cuánto representaba? | — | Tickets/operación | No disponible en analítica | Baja | Las líneas borradas antes del cierre no dejan hecho analítico |

---

# Trazabilidad y reglas de cálculo

## Ventas

Consulta real:

```sql
SUM(s.total_cents)
GROUP BY s.completed_at::date, s.currency_code
```

- Incluye sólo órdenes que ya generaron una fila en `sales`.
- Incluye ventas con estado `paid` y `pending`; no filtra por estado.
- El total incluye impuestos.
- No incluye órdenes abiertas.
- La unicidad `sales.order_id` evita dos ventas por una misma orden.
- Fuente: `apps/api/src/billing/sales-analytics.service.ts:83-95`.

## Productos

```sql
SUM(si.quantity)
SUM(si.total_cents)
GROUP BY si.product_id, si.name, s.currency_code
```

- Usa nombre histórico congelado.
- Si un producto cambia de nombre, un mismo ID puede aparecer en varias filas.
- El frontend usa sólo `productId` como clave React, por lo que esos grupos podrían colisionar.
- No distingue categoría, SKU, tamaño, base, coste o stock.
- Fuente: `apps/api/src/billing/sales-analytics.service.ts:97-112`.

## Pagos

```sql
SUM(sale_settlements.amount_cents)
GROUP BY method_code, currency_code
```

- Representa importes aplicados, no dinero entregado.
- Para efectivo, `tendered_cents` y `change_cents` se conservan, pero no se agregan.
- Admite pagos divididos porque una venta puede tener varios settlements.
- No incorpora pagos posteriores contra deuda.
- Fuente: `apps/api/src/billing/sales-analytics.service.ts:114-128`.

## Pendientes

La consulta suma `sales.pending_cents` y selecciona un único `MIN(account_id)` por venta.

Consecuencias:

- Una venta distribuida entre varias cuentas queda atribuida artificialmente a una sola.
- El saldo no disminuye cuando posteriormente se cobra una deuda, porque `sales` es inmutable.
- No coincide necesariamente con la pantalla de Cuentas por cobrar.
- El frontend suma monedas y formatea con la moneda de la primera fila. Hoy la base impone USD, pero el comportamiento no es seguro si aparece otra moneda.
- La UI muestra IDs internos de clientes en lugar de nombres.

---

# Inventario de datos

## Persistidos en snapshots de venta

### `sales`

- Venta, orden y UUID público.
- `completed_at`, `opened_at`, `closed_at`.
- Moneda.
- Subtotal, impuesto, descuento, total, pagado y pendiente.
- Estado `paid`/`pending`.
- Mesa, cliente y operador de cierre.

### `sale_items`

- Producto y nombre histórico.
- Cantidad y precio unitario.
- Subtotal, impuesto, descuento y total.
- Cuenta y cliente cuando la atribución pudo resolverse.

Faltan SKU, categoría, tasa impositiva, tamaño, identidad base, coste, `stock_item_id`, fecha original de línea e indicador de ajuste.

### `sale_settlements`

- Código de método.
- Importe aplicado.
- Importe entregado y cambio.
- Fecha de pago.
- Cuenta y cliente.

Faltan etiqueta histórica del método, tipo de settlement y referencia explícita al pago original.

## Persistidos operativamente, pero no en el snapshot

- `line_items.pour_size_ml`, tasa fiscal, indicador de ajuste y fecha de línea.
- SKU, categoría, coste y `stock_item_id` actuales del producto.
- Estados y asignaciones de tickets.
- Cuentas personales y cantidades asignadas.
- Pagos posteriores al cierre.
- Ledger de deuda.
- Movimientos de inventario.

## Requieren nueva captura o persistencia

- Producto base estable.
- Categoría histórica.
- SKU histórico.
- Tamaño histórico dentro de `sale_items`.
- Coste histórico y margen.
- Etiqueta histórica del método de pago.
- Propinas.
- Reembolsos y correcciones postcierre.
- Motivo de anulación.
- Turno, caja o local, si se requieren análisis por operación.

---

# Cerveza: presentación, producto base y litros

## Presentación

Puede analizarse actualmente por presentación porque cada tamaño es un producto diferente y `sale_items` conserva `product_id` y nombre.

## Producto base

No puede analizarse de forma confiable:

- No existe `base_product_id`.
- `stock_item_id` fue pensado para que varias presentaciones consuman el mismo barril, pero es nullable.
- No se copia en `sale_items`.
- En la base local, los 18 productos de volumen carecen de `stock_item_id`.
- Agrupar por prefijos de SKU o por texto del nombre sería una heurística frágil.

## Litros vendidos

Existe una vía derivable, pero no una fuente analítica duradera:

```text
line_items.quantity × line_items.pour_size_ml / 1000
```

En la base local inspeccionada:

- 98 líneas de ventas cerradas conservan su línea de orden original.
- 75 son líneas con volumen.
- Suman 31.340 ml, es decir 31,34 L.

No debe confundirse esto con 75 unidades: las presentaciones tienen capacidades diferentes.

Limitaciones:

- `sale_items` no conserva `pour_size_ml`.
- `PaymentClosureService` reconstruye las líneas con `pourSizeMl: null`.
- `line_items` permite borrado a nivel de base después de la migración 012; la regla de no borrar ventas cerradas depende de la aplicación.
- Un join contra el catálogo actual puede reinterpretar el pasado si el tamaño cambia.

**Conclusión:** puede reconstruirse hoy desde líneas operativas retenidas, pero antes de mostrar litros como cifra auditable hay que congelar tamaño e identidad base en el snapshot.

---

# Relación entre ventas y cobros

Las tres magnitudes deben mantenerse separadas:

```text
Vendido al cierre = sales.total_cents
Cobrado al cierre = sales.paid_cents = SUM(sale_settlements.amount_cents)
Pendiente al cierre = sales.pending_cents
```

Invariante:

```text
total = paid + pending
```

La base local cumple esa reconciliación en las 17 ventas actuales.

## Pagos parciales y divididos

- Los pagos pueden apuntar a ticket, cuenta personal o deuda de cliente.
- Una venta puede incluir varios pagos y métodos.
- Las asignaciones se hacen por cantidad de línea, no por importe arbitrario.
- El cierre evita contar simultáneamente una asignación legacy de ticket y una asignación de cuenta:
  - `apps/api/src/billing/payment-closure.service.ts:60-70`.

## Defecto verificado: cierre pendiente con pago parcial

Hay un problema funcional importante:

1. `PaymentClosureService` crea una venta `status: "pending"` pero no entrega `paidCents` ni `pendingCents`:
   - `apps/api/src/billing/payment-closure.service.ts:108`
2. `createSale` interpreta una venta pendiente como:
   - `paidCents = 0`
   - `pendingCents = totalCents`
   - `packages/shared/src/billing/model/sale.ts:81-82`
3. El reconciliador suma los settlements reales:
   - `packages/shared/src/billing/services/sale-snapshot.ts:49-74`

Si una cuenta pendiente ya pagó parcialmente, los valores calculados no coinciden y el cierre hace rollback antes del `INSERT`.

Las pruebas existentes pasan, pero no ejercitan este recorrido completo.

El `INSERT` de `sales` no tiene un problema de aridad: declara 17 columnas, utiliza 17 expresiones —incluido un `0` fijo para descuento— y recibe 16 parámetros.

## Riesgos de doble conteo

- Sumar `sales.total_cents` y `sale_settlements.amount_cents` cuenta dos veces la porción cobrada.
- Unir `payments` con `sale_settlements` puede duplicar los pagos inmediatos: el settlement es una copia al cierre.
- Los pagos posteriores de deuda están en `payments`/ledger, no deben registrarse como nueva venta.
- El total de cobros por fecha de pago y la venta por fecha de cierre son indicadores diferentes.
- En una venta con varias cuentas, `pendingExposure` atribuye todo a un único `MIN(account_id)`.

---

# Filtros de fecha

## Comportamiento actual

- Valores iniciales: ambos vacíos; se consulta todo el historial.
- Formato aceptado: `YYYY-MM-DD`.
- `Desde` es inclusivo.
- `Hasta` es inclusivo mediante `< hasta + 1 día`.
- Se rechazan fechas imposibles y rangos invertidos:
  - `apps/api/src/billing/sales-analytics.service.ts:52-77`.
- Los filtros usan `sales.completed_at`.
- No usan apertura, momento del pago ni anulación.

## Zona horaria

`completed_at::date` y los límites dependen de la zona horaria de sesión de PostgreSQL.

- La base local está en UTC.
- No hay zona horaria comercial configurada en la consulta.
- Una venta cercana a medianoche puede quedar en otro día respecto de la operación local.

## Experiencia de uso

- Los campos son `type="text"`, no controles nativos de fecha.
- Cada tecla dispara cuatro solicitudes.
- Mientras el usuario escribe una fecha incompleta, la API puede responder 400 y la pantalla muestra el error genérico.
- No hay presets, validación local ni límite de rango.
- En períodos sin ventas, la API no rellena días con cero.
- La UI muestra tablas vacías, sin un estado explícito “sin ventas”.
- El pendiente vacío se presenta como USD 0 por fallback.

---

# Calidad, volumen y rendimiento

## Base local inspeccionada

Datos agregados no personales:

- 17 ventas.
- 98 líneas históricas de venta.
- 21 settlements.
- 5 días con ventas.
- 35 órdenes.
- 33 pagos.
- 37 productos.
- 2 movimientos de inventario.

La muestra es demasiado pequeña para extrapolar rendimiento de producción.

## Integridad observada

- Todas las ventas locales reconcilian subtotal, impuesto, descuento y total.
- Todas reconcilian pagado más pendiente.
- Todas reconcilian settlements con `paid_cents`.
- Ninguna línea de venta referencia un producto inexistente.
- Ocho líneas históricas pertenecen a productos actualmente inactivos.
- No se detectaron nombres cambiados en esta muestra.
- Las 98 líneas de venta conservan una línea operativa de origen coincidente.

## Divergencia de pendientes

En la base local:

- Pendiente según snapshot analítico: 0 centavos.
- Pendiente operativo según ledger/cuentas: 336 centavos.

No necesariamente es corrupción: son fuentes y momentos distintos. Pero confirma que “Exposición pendiente” no puede interpretarse como saldo vigente sin una definición explícita.

## Métodos de pago

- La aplicación usa códigos como `CASH`, `BANK_TRANSFER` y `QR_PAYMENT`.
- El endpoint analítico presenta esos códigos sin etiqueta.
- La base local contiene además un código de fixture en `payments`, aunque no aparece en settlements.
- El mock web usa `cash` y `card`, distintos del registro real:
  - `apps/web/src/adapters/mock/analytics-service.ts:31-40`.

## Eliminaciones y renombres

- La historia conserva el nombre vendido, lo cual es correcto.
- Desactivar un producto no destruye su historial.
- Un renombre puede fragmentar el mix porque la consulta agrupa por ID y nombre.
- Categorías, tamaños y costes no están congelados, por lo que un join al catálogo actual reescribe semánticamente el pasado.

## Consultas extensas

Riesgos verificados:

- No hay paginación ni límite de rango.
- No hay índice sobre `sales.completed_at`; sólo existe sobre `closed_at`.
- El plan local hace escaneo secuencial de `sales`.
- Cuatro agregaciones completas se ejecutan por cada cambio del filtro.
- Mix de productos y pagos recorre todas las líneas/settlements del período.
- Exposición usa un subquery lateral por venta.
- Todo el resultado se materializa en el navegador.

Orden actual:

- Días: ascendente.
- Productos: por ID y nombre, no por desempeño.
- Pagos: por código.
- Pendientes: por cliente/cuenta.
- No hay controles de ordenación.

---

# Vacíos o ambigüedades

Antes del rediseño hay que resolver:

1. **Fecha comercial:** apertura, cierre, `completed_at` o pago.
2. **Zona horaria comercial:** UTC, zona del local o configurable.
3. **“Ventas”:** bruto con impuestos, neto de impuestos o ambos.
4. **“Ticket”:** orden cerrada, ticket dividido o cuenta personal.
5. **Pendiente:** originado al cierre, saldo vigente o ambos.
6. **Cobros posteriores:** si se muestran por fecha de cobro, deben separarse de la venta original.
7. **Producto base:** falta una identidad estable para reunir presentaciones.
8. **Categoría histórica:** hoy sólo existe la categoría actual.
9. **Volumen:** la fuente temporal existe en `line_items`, pero no en el snapshot analítico.
10. **Descuentos:** hay columnas, pero no comportamiento real.
11. **Anulaciones:** los borrados de borrador no dejan hecho analítico; tickets anulados no intervienen.
12. **Reembolsos:** no existe modelo.
13. **Propinas:** están explícitamente fuera del modelo.
14. **Margen:** falta coste histórico.
15. **Exposición multi-cuenta:** hay que atribuir el pendiente por cuenta, no elegir el menor ID.
16. **Ajustes:** el dominio menciona líneas de ajuste, pero el snapshot no conserva el indicador y las restricciones de persistencia no representan claramente importes negativos.

---

# Propuesta de contenido para la pantalla

No se recomienda rediseñar visualmente los cuatro paneles actuales sin corregir primero sus contratos semánticos.

## Resumen esencial para web y móvil

### Primera jerarquía

1. **Ventas brutas**
   - Suma de ventas cerradas.
   - Etiqueta explícita: “incluye impuestos”.
2. **Cobrado al cierre**
   - No mezclar con ventas.
3. **Ventas cerradas**
   - Cantidad de órdenes/ventas, hasta definir “ticket”.
4. **Ticket promedio**
   - Total vendido dividido por ventas cerradas.
5. **Pendiente**
   - Mostrar sólo después de decidir si es “originado” o “vigente”.

En móvil deberían ser tarjetas compactas, de una o dos columnas, con el período y zona horaria visibles.

### Tendencia principal

- Ventas por día con días sin actividad rellenados con cero.
- Comparación opcional contra período anterior sólo después de validar fechas y zona horaria.
- Tabla accesible como alternativa al gráfico.

### Productos

Vista resumida:

- Top productos por ingreso.
- Selector “ingreso / unidades”.
- Presentación como dimensión explícita.

No ofrecer todavía:

- Producto base.
- Litros vendidos.
- Categoría histórica.
- Margen.

Esas vistas necesitan snapshots adicionales.

### Pagos

- Mostrar etiquetas del registro de métodos, no códigos.
- Separar:
  - cobrado al cierre;
  - cobros posteriores de deuda.
- Mostrar porcentaje e importe.
- La suma del mix inmediato debe coincidir con `paid_cents`, no con ventas brutas.

### Pendientes

En el resumen mostrar sólo el total definido. El detalle operativo debe enlazar con Cuentas por cobrar, que ya dispone de:

- paginación;
- búsqueda;
- orden por saldo o actividad;
- saldo identificado/no vinculado;
- pagos acumulados.

No conviene duplicar listas de clientes dentro de Analítica ni exponer IDs internos.

## Vistas de detalle

Para web:

- Tabla diaria.
- Productos y presentaciones.
- Cobros por método.
- Impuestos.
- Horas de venta.
- Cuentas pendientes.

Para móvil:

- Resumen primero.
- Listas Top N.
- Detalles bajo navegación secundaria o expansión.
- Evitar cuatro tablas completas apiladas.

## Métricas que deben quedar fuera por ahora

- Margen.
- Reembolsos.
- Propinas.
- Base de cerveza.
- Litros como cifra auditada.
- Categoría histórica.
- Rendimiento por turno/caja.

---

# Recomendación para la siguiente fase

## 1. Corregir integridad antes del refactor visual

- Calcular y pasar explícitamente `paidCents` y `pendingCents` durante el cierre.
- Agregar una prueba integral para cuenta pendiente parcialmente pagada.
- Mantener la reconciliación:

```text
subtotal + impuesto - descuento = total
sum(settlements) = paid
paid + pending = total
```

## 2. Fijar definiciones de negocio

Documentar y aprobar:

- zona horaria;
- fecha comercial;
- definición de ticket;
- bruto/neto;
- pendiente originado frente a pendiente vigente;
- tratamiento de cobros posteriores.

## 3. Crear un contrato analítico coherente

Conviene un endpoint de resumen que devuelva en una sola respuesta:

- período efectivo y zona horaria;
- ventas, subtotal, impuestos y descuentos;
- ventas cerradas y ticket promedio;
- cobrado al cierre;
- pendiente originado;
- advertencias de disponibilidad.

Los detalles podrían seguir paginados o consultarse bajo demanda.

## 4. Mejorar la historia de producto si se requieren análisis avanzados

Agregar a `sale_items`:

- SKU histórico.
- Categoría histórica.
- `pour_size_ml`.
- `base_product_id` o identidad de familia.
- `stock_item_id`, si ésa será la agrupación canónica.
- Tasa fiscal.
- Indicador de ajuste.
- Coste histórico sólo si se aprueba reporting de margen.

## 5. Corregir rendimiento

- Índice coherente con la fecha elegida: `completed_at` o uso de `closed_at`.
- Rango máximo o granularidad automática.
- Paginación para productos y pendientes.
- Top N desde servidor.
- Aplicación explícita del filtro o debounce.
- Una consulta consolidada donde sea posible.

## Criterios de verificación de cifras

1. La suma diaria debe coincidir con el total del período.
2. La suma de productos debe coincidir con los totales de líneas.
3. La suma del mix de pagos debe coincidir con `paid_cents`.
4. `paid + pending = total` en cada venta.
5. El saldo vigente debe reconciliar débitos, créditos y cuentas no vinculadas.
6. Una venta dividida entre varias cuentas debe atribuir cada saldo una sola vez.
7. Los pagos posteriores no deben aumentar ventas.
8. Un reintento de cierre no debe duplicar venta ni settlements.
9. Los límites de fecha deben probarse justo antes y después de medianoche en la zona comercial.
10. Los períodos vacíos deben devolver ceros y series completas, no ambigüedad.
11. Una cerveza de 330 ml y otra de 1.000 ml deben sumar dos unidades pero 1,33 litros.
12. Renombrar o desactivar un producto no debe alterar informes históricos.

## Decisión recomendada

La siguiente fase debería ser un refactor de **semántica y contrato de datos**, seguido del rediseño responsive. Si se cambia primero la presentación, se corre el riesgo de dar mayor prominencia visual a cifras que hoy responden preguntas distintas bajo etiquetas ambiguas.

---

# Verificación realizada

Comandos ejecutados durante la investigación:

```bash
pnpm exec vitest run --no-file-parallelism \
  apps/api/src/billing/sales-analytics.service.test.ts \
  apps/web/src/features/analytics/AnalyticsScreen.test.tsx \
  apps/web/src/adapters/http/analytics-service.test.ts \
  packages/shared/src/billing/services/sale-snapshot.test.ts \
  apps/api/src/billing/payment-closure.service.test.ts
```

Resultado: 5 archivos y 13 pruebas pasaron.

```bash
pnpm exec vitest run --no-file-parallelism \
  packages/shared/src/billing/model/order-closure.test.ts
```

Resultado: 1 archivo y 5 pruebas pasaron.

Cobertura faltante relevante:

- cierre parcialmente pagado y pendiente por el recorrido completo de `PaymentClosureService`;
- límites de medianoche y zona horaria;
- ventas con varias cuentas pendientes;
- cambio histórico de nombre/categoría/tamaño;
- períodos extensos;
- múltiples monedas en la interfaz;
- anulaciones, ajustes y futuros reembolsos.
