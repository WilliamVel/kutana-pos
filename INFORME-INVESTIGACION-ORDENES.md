# Informe de investigación: pantalla de Órdenes

## 1. Causa raíz

El parpadeo ocurre realmente por la combinación de varios problemas de sincronización:

1. Al navegar a Órdenes, `App` monta nuevamente `OrdersOverviewContainer`.
2. Ese componente inicia con:

```ts
const [rows, setRows] = useState<OrdersOverviewRow[]>([]);
```

3. `OrdersOverview` interpreta inmediatamente `rows.length === 0` como estado vacío y muestra:

> No hay órdenes abiertas.

No existe un estado `loading` para distinguir “todavía cargando” de “carga completada sin órdenes”.

Además, durante cada recarga se ejecuta explícitamente:

```ts
setRows([]);
```

Por tanto, incluso si ya existían órdenes válidas, se eliminan temporalmente antes de completar la nueva consulta.

El mensaje **“Cargando sección…”** es independiente de la carga real. `App` lo muestra durante solamente 280 ms:

```ts
setTimeout(() => setIsNavigating(false), 280);
```

Ese temporizador no espera a que las consultas terminen.

La carga real tarda más porque:

- Primero se consultan las mesas.
- Después se consulta la orden de cada mesa en paralelo.
- Para cada orden se consultan las cuentas personales.
- Después se consultan los pagos de cada cuenta.
- Cada fila se incorpora individualmente mediante `setRows`.

Por eso aparecen primero estados vacíos, luego listas parciales y finalmente la información completa.

## 2. Evidencia encontrada

### Navegación

Archivo: `apps/web/src/App.tsx`

La pestaña se renderiza condicionalmente:

```tsx
{screen === "register" ? <RegisterWorkspace ... /> : null}
```

Al cambiar de sección, los componentes de Órdenes se desmontan. Al regresar, se montan de nuevo y todos sus estados locales vuelven a sus valores iniciales.

`selectedTableId` no se limpia al abandonar Órdenes. Si existía una mesa seleccionada, al regresar puede reaparecer inmediatamente el panel central y sus acciones.

### Carga de la lista

Archivo: `features/ordering/containers/OrdersOverviewContainer.tsx`

Secuencia real:

```text
mount
  -> rows = []
  -> tables.listAll()
  -> setTableList(allTables)
  -> setRows([])
  -> Promise.allSettled(allTables.map(refreshTable))
       -> orders.findByTable(table.id)
       -> personalAccounts.listByOrder(order.id)
       -> payments.listByTarget(...) por cuenta
       -> setRows(...)
  -> setEventsReady(true)
```

Cada `refreshTable` produce una fila solamente después de completar sus consultas relacionadas:

```ts
const order = await orders.findByTable(table.id);
const row = await toRow(table, order, personalAccounts, payments);
setRows(...);
```

Sin embargo, las filas se agregan una por una. Durante ese intervalo el contador de órdenes puede mostrar un valor parcial.

### Estado vacío

Archivo: `features/ordering/components/OrdersOverview.tsx`

Actualmente solo se evalúa:

```tsx
if (rows.length === 0) {
  return <p>No hay órdenes abiertas.</p>;
}
```

No se recibe ningún `loading`, `initialLoading` o estado equivalente.

### Panel de la orden seleccionada

Archivo: `features/ordering/containers/OrderTicketPanelContainer.tsx`

La carga también es escalonada:

```text
tables.findById(tableId)
  -> orders.findByTable(tableId)
  -> setOrder(foundOrder)
  -> personalAccounts.listByOrder(...)
  -> personalAccounts.listAllocationsByOrder(...)
  -> customers.listAll()
  -> payments.listByTarget(...)
```

El panel puede renderizarse después de `setOrder(foundOrder)`, antes de que terminen cuentas, asignaciones y pagos. Esto explica productos o estados de pago incompletos temporalmente.

### Contador “Pedido”

Archivo: `features/ordering/components/RegisterWorkspace.tsx`

El contador inicia siempre en cero:

```ts
const [orderCount, setOrderCount] = useState(0);
```

Solo se actualiza mediante el evento global `kutana.order.updated`.

Ese evento se dispara desde:

- `OrderTicketPanelContainer`
- `AddItemContainer`

Por tanto, el contador necesariamente muestra `0` hasta que alguna de esas cargas termina y emite el evento.

### Botones Dividir y Pagar

Archivo: `App.tsx`

Los botones dependen únicamente de:

```tsx
if (selectedTableId) {
  ...
  <Button>Dividir</Button>
  <Button>Pagar</Button>
}
```

No dependen de que exista una orden confirmada ni de que la carga haya terminado.

Esto permite mostrar botones cuando:

- La orden todavía no llegó.
- La mesa ya no tiene una orden válida.
- Se conserva un `selectedTableId` anterior al cambiar de pestaña.

### Consultas duplicadas

Al regresar a Órdenes pueden montarse simultáneamente:

1. `OrdersOverviewContainer`
   - `tables.listAll()`
   - `orders.findByTable()` para cada mesa
   - cuentas personales
   - pagos

2. `NewOrderContainer`
   - `tables.listAll()`

3. `OrderTicketPanelContainer`, si hay mesa seleccionada
   - `tables.findById()`
   - `orders.findByTable()`
   - cuentas
   - asignaciones
   - clientes
   - pagos

4. `AddItemContainer`, si hay mesa seleccionada
   - categorías
   - productos por categoría
   - `orders.findByTable()`

No hay una librería de caché de consultas ni coordinación entre estos flujos. Los repositorios HTTP hacen solicitudes directas.

### React Strict Mode

Archivo: `apps/web/src/main.tsx`

La aplicación usa:

```tsx
<StrictMode>
```

En desarrollo, React ejecuta efectos dos veces para detectar efectos secundarios.

Esto puede hacer más visibles las solicitudes duplicadas. Además, los `setTimeout` usados para emitir `kutana.order.updated` en `OrderTicketPanelContainer` y `AddItemContainer` no se cancelan durante el cleanup, por lo que pueden producir eventos duplicados o antiguos.

### Logs existentes

Ya existen logs útiles, sin necesidad de modificar el código:

- `[api] request`
- `[api] response`
- `[orders] loading tables`
- `[orders] tables response`
- `[orders] loading table`
- `[orders] table response`
- `[orders] row result`
- `[orders] load completed`
- `[orders] failed loading...`

Estos permiten confirmar la secuencia desde la consola del navegador. No se añadieron cambios ni instrumentación nueva.

## 3. Estados transitorios incorrectos

No deberían mostrarse durante la carga inicial:

- **“No hay órdenes abiertas”**: actualmente se muestra porque `rows` empieza vacío.
- **Contador Pedido en `0`**: debería permanecer indeterminado, conservar el dato anterior o esperar la carga.
- **Botones Dividir y Pagar**: deberían estar ocultos o deshabilitados hasta validar la orden.
- **Conteos parciales de órdenes**: las filas se agregan individualmente.
- **Productos o pagos incompletos**: el panel publica la orden antes de terminar la información asociada.

“Cargando sección…” tampoco representa correctamente la carga de datos porque desaparece después de 280 ms, aunque las consultas sigan pendientes.

## 4. Alternativas de mitigación

### A. Diferenciar estados de carga

Agregar estados conceptuales:

```text
initialLoading
refreshing
success
empty
error
```

**Ventajas:** solución clara y correcta semánticamente.  
**Riesgos:** requiere ajustar contenedor, vista y pruebas.  
**Esfuerzo:** bajo-medio.

### B. No limpiar `rows` durante una actualización

Eliminar el `setRows([])` cuando se recarga.

**Ventajas:** evita el flash y conserva información útil.  
**Riesgos:** durante la actualización podrían verse datos antiguos brevemente.  
**Esfuerzo:** bajo.

Debe combinarse con un indicador discreto de actualización.

### C. Mostrar vacío solo cuando todas las consultas terminen

Mantener `rows = []`, pero mostrar el vacío únicamente cuando:

```text
loading === false && rows.length === 0
```

**Ventajas:** evita estados falsos.  
**Riesgos:** no resuelve por sí solo la pérdida de datos anteriores durante refresh.  
**Esfuerzo:** bajo.

### D. Conservar la selección válida

Validar que `selectedTableId` siga perteneciendo a una mesa con orden válida antes de mostrar el panel y las acciones.

**Ventajas:** elimina botones inválidos y paneles obsoletos.  
**Riesgos:** requiere coordinación entre `App` y la lista.  
**Esfuerzo:** medio.

### E. Coordinar la carga del panel de orden

Esperar a que orden, cuentas, asignaciones y pagos estén listos antes de renderizar el panel completo.

**Ventajas:** evita productos y estados de pago incompletos.  
**Riesgos:** el panel puede aparecer un poco más tarde.  
**Esfuerzo:** medio.

### F. Compartir o cachear datos

Usar una caché existente o introducir una solución de consultas.

**Ventajas:** reduce solicitudes duplicadas y mejora navegación.  
**Riesgos:** introduce complejidad y posiblemente dependencias nuevas.  
**Esfuerzo:** medio-alto.

No parece necesario como primera solución.

### G. Mejorar el contador

El contador debería derivarse de una fuente válida o conservar el último valor confirmado, en lugar de iniciar visualmente en `0`.

**Ventajas:** elimina el flash del contador.  
**Riesgos:** conservar un valor anterior puede ser incorrecto si la mesa cambió.  
**Esfuerzo:** bajo-medio.

### H. Corregir efectos y eventos duplicados

Cancelar los `setTimeout` y proteger las cargas frente a respuestas obsoletas.

**Ventajas:** reduce inconsistencias y ruido en desarrollo.  
**Riesgos:** no resuelve por sí solo el estado vacío inicial.  
**Esfuerzo:** bajo.

## 5. Solución recomendada

Recomiendo una solución incremental sin nuevas dependencias:

1. En `OrdersOverviewContainer`, agregar un estado de carga inicial y de actualización.
2. No ejecutar `setRows([])` durante una recarga si ya existen filas válidas.
3. Mostrar “No hay órdenes abiertas” únicamente cuando la carga inicial haya terminado correctamente.
4. Mostrar un indicador discreto de actualización sin ocultar las órdenes anteriores.
5. Coordinar el renderizado del panel de orden para no mostrar información de pagos incompleta.
6. En `App`, mostrar Dividir y Pagar solo cuando exista una orden válida confirmada.
7. Limpiar o validar `selectedTableId` al cambiar de sección.
8. Corregir los `setTimeout` de eventos para que puedan cancelarse.
9. Mantener la suscripción SSE actual; no parece ser la causa principal.

Esta opción evita el parpadeo, no agrega dependencias y respeta la arquitectura actual basada en contenedores y puertos.

## 6. Plan de implementación

### `apps/web/src/features/ordering/containers/OrdersOverviewContainer.tsx`

Modificar:

- Añadir `initialLoading` y posiblemente `refreshing`.
- Marcar carga inicial antes de `tables.listAll()`.
- No vaciar `rows` cuando ya hay datos válidos.
- Confirmar la carga antes de permitir el estado vacío.
- Mantener protección contra respuestas posteriores a un desmontaje.
- Considerar construir todas las filas y hacer un único `setRows` al finalizar, evitando conteos parciales.
- Exponer al componente presentacional el estado de carga.

### `apps/web/src/features/ordering/components/OrdersOverview.tsx`

Modificar:

- Recibir `loading` o un estado equivalente.
- Mostrar carga inicial en lugar de “No hay órdenes abiertas”.
- Mostrar el vacío solo después de una carga exitosa sin filas.
- Mostrar actualización discreta cuando ya existen datos.

### `apps/web/src/App.tsx`

Modificar:

- Validar la existencia de una orden antes de renderizar Dividir y Pagar.
- Revisar la conservación de `selectedTableId` al salir y regresar a Órdenes.
- Posiblemente introducir una selección confirmada o un callback de invalidación desde la lista.

### `apps/web/src/features/ordering/containers/OrderTicketPanelContainer.tsx`

Modificar:

- Coordinar la carga de orden, cuentas, asignaciones y pagos.
- Evitar publicar/renderizar datos de pago incompletos.
- Cancelar correctamente los `setTimeout` usados para actualizar el contador.
- Evitar que una respuesta antigua reemplace datos más recientes.

### `apps/web/src/features/ordering/containers/AddItemContainer.tsx`

Modificar:

- Cancelar el `setTimeout` del evento global.
- Evitar que este componente y el panel principal compitan por actualizar el contador.
- Mantener la protección contra respuestas obsoletas.

### `apps/web/src/features/ordering/components/RegisterWorkspace.tsx`

Modificar:

- Evitar presentar `0` como valor confirmado durante la carga.
- Recibir posiblemente el conteo desde el estado de la orden seleccionada o mostrar un estado visual neutro.

### Pruebas

Agregar o actualizar pruebas para verificar:

1. La carga inicial no muestra “No hay órdenes abiertas”.
2. El vacío aparece únicamente después de una respuesta vacía real.
3. Las órdenes anteriores permanecen visibles durante una recarga.
4. No se muestran Dividir/Pagar sin orden válida.
5. El contador no parpadea en `0`.
6. El panel no muestra pagos incompletos.
7. Las respuestas tardías no reemplazan datos nuevos.
8. Las consultas no producen actualizaciones duplicadas relevantes bajo `StrictMode`.

La investigación no modificó código. El estado modificado existente del repositorio pertenece a otros archivos y se mantuvo intacto.
