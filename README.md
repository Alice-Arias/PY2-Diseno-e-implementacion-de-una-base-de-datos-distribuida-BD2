# Proyecto 2 — Diseño e implementación de una base de datos distribuida

**Wide World Importers** · Bases de Datos II

| | |
| --- | --- |
| **Integrantes** | _[Alice Arias Salazar]_ · _[Heldyis Agüero Espinoza]_ |
| **Profesor** | _[Cristian Paz Campos Agüero]_ |
| **Infraestructura** | 3 nodos SQL Server 2022 (1 Windows + 2 Linux), API Node.js/Express, web React + Vite |

---

## 1. Resultado

**Se completó todo lo solicitado en el enunciado.** Cada punto se probó desde SQL Server y desde la aplicación web.

| Requisito | Estado | Dónde |
| --- | --- | --- |
| 3 nodos independientes (Corporativo, San José, Limón), con distinto sistema operativo | ✅ | §2 |
| Roles **Administrador** y **Corporativo** | ✅ | §8 |
| Tabla de usuarios (`iduser, username, password, fullname, active, rol, email, hiredate`) con contraseña **encriptada** con el cifrado nativo de SQL Server | ✅ | §8.1 |
| Relación entre usuarios de la aplicación y usuarios de la base de datos | ✅ | §8.2 |
| Fragmentación y asignación **justificadas** | ✅ | §3 y §4 |
| Datos sensibles de clientes y proveedores **solo en el Corporativo** | ✅ | §3.1 y §8.4 |
| Replicación del catálogo de productos (insertar, modificar y eliminar) | ✅ | §5 |
| Estadísticas **por sucursal o consolidadas** | ✅ | §7 |
| Vistas materializadas en el Corporativo | ✅ | §7 |
| Concurrencia en catálogos replicados | ✅ | §6 |
| Respuesta ante la falla de un nodo | ✅ | §9 |

### Decisiones que conviene conocer

- **Clientes y proveedores son de solo consulta para el Administrador.** El enunciado define que el Administrador _"podrá consultar clientes, proveedores, productos y facturas"_ y _"crear, modificar y eliminar productos"_. Por eso se retiraron de la web las opciones de crear, modificar y eliminar clientes y proveedores del Proyecto 1. Las demás funcionalidades del Proyecto 1 se mantienen: consultas con filtros y paginación, detalle, ventas, inventario y reportes.
- **Los datos sensibles requieren autorización.** Además de guardarse solo en el Corporativo, el Administrador los ve como `xxxx` hasta que el Corporativo aprueba una solicitud de acceso (§8.4).

---

## 2. Arquitectura

```
                         ┌──────────────────────────────────────────┐
                         │  CORPORATIVO — Plaza Roble, Escazú       │
                         │  SQL Server 2022 Developer · Windows     │
                         │  Puerto 1433 · alias corporativo_escazu  │
                         │                                          │
                         │  · Datos sensibles (clientes, proveedores│
                         │    y contactos)                          │
                         │  · Catálogo maestro (publicador)         │
                         │  · Usuarios y solicitudes de acceso      │
                         │  · Estadísticas consolidadas             │
                         └───────┬──────────────────────┬───────────┘
              replicación ↓      │  linked servers ↕    │      ↓ replicación
                ┌────────────────┴───────┐     ┌────────┴───────────────┐
                │ SUCURSAL SAN JOSÉ      │     │ SUCURSAL LIMÓN         │
                │ SQL Server 2022 · Linux│     │ SQL Server 2022 · Linux│
                │ Docker, puerto 1436    │     │ Docker, puerto 1437    │
                │ · Catálogo (réplica)   │     │ · Catálogo (réplica)   │
                │ · Sus pedidos/facturas │     │ · Sus pedidos/facturas │
                │ · Sus existencias      │     │ · Sus existencias      │
                └────────────────────────┘     └────────────────────────┘

   Web (React, Vite :5173) ──► API (Node/Express :4000) ──► nodo según el rol del usuario
```

| Nodo | Motor y sistema operativo | Cómo se conecta |
| --- | --- | --- |
| Corporativo | SQL Server 2022 Developer en **Windows** | `corporativo_escazu` (alias a `127.0.0.1,1433`) |
| San José | SQL Server 2022 en **Linux** (contenedor Docker en WSL) | `sanjose` (alias que actualiza `levantar.sh`) |
| Limón | SQL Server 2022 en **Linux** (contenedor Docker en WSL) | `limon` (alias que actualiza `levantar.sh`) |

La aplicación conserva la arquitectura del Proyecto 1 (React → API Node.js → procedimientos almacenados). La API mantiene **un pool de conexiones por nodo y por rol**, y cada petición se dirige al nodo del usuario que inició sesión.

---

## 3. Fragmentación

### 3.1 Fragmentación vertical — datos sensibles

**Tablas:** `Sales.Customers`, `Purchasing.Suppliers`, `Application.People`.

| Fragmento | Columnas | Nodo |
| --- | --- | --- |
| **Sensible** | Contactos (`PrimaryContactPersonID`, `AlternateContactPersonID`), `PhoneNumber`, `FaxNumber`, `WebsiteURL`, direcciones de entrega y postales, códigos postales, `DeliveryLocation` y, en proveedores, los **datos bancarios**. En personas: teléfono, fax, correo, foto y contraseña | **Corporativo** |
| **Operativo** | Identificador, nombre, categoría, grupo de compra, método de entrega, ciudad, crédito, descuento, días de pago, etc. | **San José y Limón** (y Corporativo) |

**Justificación.** El enunciado indica que los datos *"sensibles a su privacidad / forma de contacto"* deben estar en el Corporativo, y los demás en las sucursales. Con esto, si una sucursal se ve comprometida, en su base **no hay** datos sensibles: las columnas fueron **eliminadas**, no ocultadas. Se borró también el historial temporal (`*_Archive`), porque guardaba versiones anteriores de esos mismos datos.

**Reconstrucción.** Los dos fragmentos comparten la llave primaria (`CustomerID` / `SupplierID`), así que la unión por esa llave reconstruye la tabla original. El Corporativo expone la parte sensible en las vistas `Sensible.Clientes`, `Sensible.Proveedores` y `Sensible.Personas`. Estas vistas no incluyen la columna `geography`, que no se puede leer por linked server, y entregan en su lugar la latitud y la longitud.

### 3.2 Fragmentación horizontal — facturación e inventario

**Facturación: fragmentación primaria sobre pedidos y derivada sobre facturas.**

La base histórica no indica a qué sucursal pertenece cada venta, así que se usó una regla determinística y balanceada sobre el **pedido**:

```
Pedidos_SJ        = σ (OrderID mod 2 = 0) (Sales.Orders)
Pedidos_LM        = σ (OrderID mod 2 = 1) (Sales.Orders)

Facturas_SJ       = Sales.Invoices     ⋉ Pedidos_SJ        -- derivada (por OrderID)
LineasFactura_SJ  = Sales.InvoiceLines ⋉ Facturas_SJ       -- derivada (por InvoiceID)
```

Un pedido es la solicitud del cliente, y la factura es el cobro que se emite a partir de ese pedido (`Invoices.OrderID`). Fragmentar las facturas **por su pedido**, y no por su propio número, garantiza que un pedido, su factura y sus líneas queden siempre en el mismo nodo. Con el mismo criterio se fragmentaron las órdenes de compra (`PurchaseOrderID`), sus líneas, y las transacciones de clientes, proveedores e inventario.

- Cada tabla fragmentada tiene la columna **`SucursalID`**, con un `CHECK (SucursalID = 1)` en San José y `= 2` en Limón: **el predicado del fragmento queda declarado en la tabla**.
- Las **ventas nuevas** pertenecen a la sucursal donde se crean (`SucursalID` por defecto). Cada sucursal genera sus identificadores en un rango propio: San José desde **10 000 000** y Limón desde **20 000 000**. Así no hay choques al consolidar.

**Inventario: catálogo replicado y existencias fragmentadas.**

| Parte | Tabla | Técnica |
|---|---|---|
| Catálogo (nombre, precio, proveedor, grupos, colores, empaques) | `Warehouse.StockItems` y relacionadas | **Replicación completa** en los 3 nodos |
| Existencias (cantidad, ubicación, costo, reorden) | `Warehouse.StockItemHoldings` | **Horizontal**: cada sucursal tiene las suyas, con `SucursalID` |

Las existencias originales se repartieron entre las dos sucursales (mitad y mitad). Un producto nuevo tiene existencias solo en la sucursal que lo registra.

### 3.3 Corrección de la fragmentación

| Propiedad | Comprobación | Resultado |
|---|---|---|
| **Completitud** | Facturas: 35 254 (San José) + 35 256 (Limón) | **70 510** = total original ✅ |
| | Líneas de factura: 114 208 + 114 057 | **228 265** = total original ✅ |
| **Disjunción** | Ninguna factura en las dos sucursales: las sumas no superan el total | ✅ |
| **Reconstrucción** | Monto consolidado en el Corporativo | **USD 198 043 439,45** = base original ✅ |

---

## 4. Asignación

| Fragmento | Nodo | Justificación |
|---|---|---|
| Datos sensibles de clientes, proveedores y contactos | Corporativo | Lo exige el enunciado (privacidad). Un solo lugar protegido y auditado |
| Datos operativos de clientes y proveedores | Las tres bases | Mismo catálogo en todas las sucursales. Cada sucursal los consulta **localmente**, sin depender de la red |
| Catálogo de productos | Las tres (maestro en el Corporativo) | Mismo catálogo en todas las sucursales. Se lee constantemente, así que conviene tenerlo local |
| Pedidos, facturas, órdenes de compra y transacciones | Su sucursal | Cada sucursal maneja su facturación. **Localidad**: las ventas se registran y consultan donde ocurren, y siguen funcionando aunque el otro nodo falle |
| Existencias | Su sucursal | Cada sucursal maneja su propio inventario |
| Copia consolidada de facturas y existencias | Corporativo | El Corporativo supervisa los dos negocios: las estadísticas se calculan sin consultar las sucursales en cada reporte |
| Usuarios y solicitudes de acceso | Corporativo | Seguridad centralizada: un solo punto de autenticación y de autorización |

---

## 5. Replicación

**Replicación transaccional** de SQL Server (`08_Corporativo_Replicacion.sql`):

| Elemento | Configuración |
|---|---|
| Publicador y distribuidor | Corporativo |
| Publicación | `CatalogoProductos` |
| Artículos | `Warehouse.Colors`, `PackageTypes`, `StockGroups`, `StockItems`, `StockItemStockGroups` |
| Suscriptores | `sanjose` y `limon`, suscripciones *push* |
| Inicialización | `replication support only`: los tres nodos partieron del mismo backup, así que no hace falta enviar una instantánea |

- Las tablas del catálogo eran **tablas temporales**, que la replicación transaccional no admite. Se les quitó el versionado (`07_Todos_PrepararCatalogo.sql`) y se agregaron valores por defecto a `ValidFrom` y `ValidTo`.
- Cuando un Administrador crea, modifica o elimina un producto, su sucursal llama al procedimiento del Corporativo (`Catalogo.SP_Producto_*`) por el linked server. El Corporativo aplica el cambio, y la replicación lo lleva a **las dos** sucursales en segundos. El procedimiento de la sucursal **espera a que llegue la réplica** antes de responder, para que la pantalla ya muestre el dato actualizado.

---

## 6. Concurrencia

| Problema | Solución |
|---|---|
| Dos sucursales modifican el catálogo replicado al mismo tiempo | **Un solo punto de escritura**: todos los cambios del catálogo se aplican en el Corporativo, y nunca se escriben versiones distintas en nodos distintos |
| Dos sucursales crean a la vez un producto con el mismo nombre | Validación con `UPDLOCK, HOLDLOCK` dentro de la transacción del Corporativo |
| Dos administradores editan el mismo producto (actualización perdida) | **Control optimista**: el detalle devuelve una `Version`, y al guardar se envía de vuelta. Si otro usuario cambió el producto, se rechaza con *"Otro usuario modificó este producto mientras usted lo editaba"* (HTTP 409) |
| Se elimina un producto que tiene ventas en otra sucursal | Antes de eliminar, el Corporativo verifica **las dos** sucursales. Si hay movimientos, o una sucursal no responde, **no** se elimina |
| Dos sucursales generan el mismo número de factura | Secuencias en rangos separados por sucursal |

Se probó desde la web, con dos pestañas editando el mismo producto: la primera guarda y la segunda recibe el aviso de conflicto.

---

## 7. Estadísticas: vistas materializadas y filtro por sucursal

`16_Corporativo_Estadisticas.sql`

- **Consolidación:** `Estadisticas.SP_Sincronizar` trae, por los linked servers, las facturas nuevas o modificadas y las existencias de cada sucursal. Lo ejecuta un **job de SQL Server Agent cada 5 minutos**, y también se puede lanzar desde la web con *Actualizar datos de sucursales*.
- **Vistas materializadas** (vistas indexadas de SQL Server), que se mantienen al día solas cuando entran datos:
  - `Estadisticas.vw_VentasSucursalMes`: ventas, ganancia y unidades por sucursal, año y mes.
  - `Estadisticas.vw_TotalesFactura`: totales por factura.
- **Filtro por sucursal o consolidado:** los 11 reportes del proyecto reciben `@Sucursal` (vacío = consolidado, 1 = San José, 2 = Limón). El valor se guarda en `SESSION_CONTEXT`, y las tablas de facturas, compras e inventario se leen a través de vistas que filtran según ese valor. Así, el código de los reportes del Proyecto 1 se mantuvo casi sin cambios.
- `Estadisticas.SP_Resumen_Sucursales` alimenta el panel del Corporativo: totales, ventas por mes, **comparativo entre sucursales** y estado de los datos de cada una.

---

## 8. Seguridad

### 8.1 Tabla de usuarios con contraseña encriptada

`Seguridad.Usuarios`, en el Corporativo (`09_Corporativo_Usuarios.sql`). Tiene los campos pedidos más `SucursalID`, que indica la sucursal de cada Administrador.

```
Service Master Key
  └─ Database Master Key
       └─ Certificado CertUsuarios
            └─ Llave simétrica LlaveUsuarios (AES_256)
                 └─ password = ENCRYPTBYKEY(..., @password, 1, username)
```

El `username` se usa como **autenticador**: un valor cifrado copiado a otra fila no se puede descifrar. El login se valida con `Seguridad.SP_Usuario_Login`, que no devuelve la contraseña y no indica si falló el usuario o la contraseña.

### 8.2 Relación entre usuarios de la aplicación y usuarios de la base de datos

La API **nunca** usa `sa`. Según el usuario que inició sesión, se conecta con un login de base de datos que **solo puede ejecutar sus procedimientos**; no puede leer tablas directamente. Los permisos se otorgan a **roles** de base de datos.

| Usuario de la aplicación | Login de BD | Nodo | Rol de BD | Puede ejecutar |
|---|---|---|---|---|
| Cualquiera, en la pantalla de login | `app_login` | Corporativo | `rol_login` | Solo `SP_Usuario_Login` |
| Corporativo | `app_corporativo` | Corporativo | `rol_corporativo` | Estadísticas y solicitudes de acceso |
| Administrador de San José | `app_admin` | San José | `rol_admin_sucursal` | Procedimientos de la aplicación (`SP_...`) |
| Administrador de Limón | `app_admin` | Limón | `rol_admin_sucursal` | Procedimientos de la aplicación (`SP_...`) |

Entre los nodos, los linked servers usan logins dedicados: `enlace_sucursal` (de las sucursales hacia el Corporativo) y `enlace_corporativo` (del Corporativo hacia las sucursales).

### 8.3 Ejecución con permisos del dueño

SQL Server no permite que un login que no es administrador use un linked server. Los procedimientos que **sí** necesitan otro nodo (los de productos, la eliminación verificada y la sincronización) se declaran `WITH EXECUTE AS OWNER`, y la base es `TRUSTWORTHY`. Así, `app_admin` y `app_corporativo` **no** pueden usar los linked servers por su cuenta: solo a través de esos procedimientos. Es un compromiso conocido entre seguridad y funcionalidad, y queda acotado a esos procedimientos.

### 8.4 Acceso controlado a los datos sensibles

`17_Corporativo_SolicitudesAcceso.sql`

1. El Administrador ve contactos, teléfonos, direcciones y datos bancarios como `xxxx`. La sucursal **no** tiene esos datos, y su rol tampoco tiene permiso sobre los sinónimos que apuntan al Corporativo.
2. Desde el detalle puede **solicitar acceso**, indicando un motivo opcional.
3. El Corporativo ve la solicitud en el menú **Solicitudes**, con un contador de pendientes, y la **aprueba** (durante 1, 4, 8 o 24 horas) o la **rechaza**.
4. `Seguridad.SP_DatosSensibles_Obtener` **solo** entrega los datos si hay una aprobación vigente. La regla se cumple en la base de datos, no solo en la pantalla.

---

## 9. Respuesta ante la falla de un nodo

| Falla | Comportamiento |
|---|---|
| **Una sucursal** no responde | La otra sucursal sigue funcionando con normalidad. Los usuarios de la sucursal caída ven el aviso *"El nodo X no está disponible en este momento"*. En las estadísticas, esa sucursal aparece como **sin conexión**, y se siguen mostrando sus últimos datos sincronizados, con la fecha de corte. No se permite eliminar productos, porque no se puede verificar que no tengan ventas en ese nodo |
| **El Corporativo** no responde | Las sucursales siguen vendiendo y consultando sus datos. No se pueden crear, modificar ni eliminar productos (*"El Corporativo no está disponible..."*), no se pueden consultar datos sensibles, y no se puede iniciar sesión, porque la autenticación es centralizada |
| Se recupera el nodo | La replicación entrega los cambios pendientes del catálogo, y la siguiente sincronización actualiza las estadísticas |

Se probó deteniendo el contenedor de Limón (`docker stop limon`) durante la aplicación en uso.

---

## 10. Scripts (`Script/`)

| # | Script | Nodo | Contenido |
|---|---|---|---|
| 01 | `01_Corporativo_Fragmentacion.sql` | Corporativo | `SucursalID` en la copia consolidada |
| 02 | `02_Sucursal_Fragmentacion.sql` | Sucursales | Fragmentación vertical y horizontal, existencias, secuencias por rango |
| 03 | `03_Corporativo_LoginEnlace.sql` | Corporativo | Login `enlace_sucursal` y vistas `Sensible.*` |
| 04 | `04_Sucursal_LinkedServer.sql` | Sucursales | Linked server `CORPORATIVO` |
| 05 | `05_Sucursal_LoginEnlace.sql` | Sucursales | Login `enlace_corporativo` |
| 06 | `06_Corporativo_LinkedServers.sql` | Corporativo | Linked servers `LS_SANJOSE` y `LS_LIMON` |
| 07 | `07_Todos_PrepararCatalogo.sql` | Los tres | Catálogo sin versionado temporal |
| 08 | `08_Corporativo_Replicacion.sql` | Corporativo | Distribuidor, publicación y suscripciones |
| 09 | `09_Corporativo_Usuarios.sql` | Corporativo | Tabla de usuarios y cifrado |
| 10 | `10_Corporativo_SeguridadApp.sql` | Corporativo | Logins y roles de la aplicación |
| 11 | `11_Sucursal_SeguridadApp.sql` | Sucursales | Login y rol de la aplicación |
| 12 | `12_Sucursal_Sinonimos.sql` | Sucursales | Sinónimos locales y hacia el Corporativo |
| 13 | `13_Sucursal_Procedimientos.sql` | Sucursales | Procedimientos del Proyecto 1 adaptados |
| 14 | `14_Corporativo_Catalogo.sql` | Corporativo | Crear, modificar y eliminar productos (concurrencia) |
| 15 | `15_Sucursal_Productos.sql` | Sucursales | Productos vía Corporativo y existencias locales |
| 16 | `16_Corporativo_Estadisticas.sql` | Corporativo | Sincronización, vistas materializadas y reportes con `@Sucursal` |
| 17 | `17_Corporativo_SolicitudesAcceso.sql` | Corporativo | Solicitudes de acceso a datos sensibles |

Los scripts de sucursal son **los mismos** para San José y Limón: detectan el nodo con `@@SERVERNAME`. Todos se pueden volver a ejecutar sin dañar nada, y se detienen solos si se ejecutan en el nodo equivocado.

---

## 11. Instalación y ejecución

La instalación completa en una computadora nueva está en **[INSTALACION.md](INSTALACION.md)**: requisitos de Windows y `./instalar_todo.sh`, que restaura los tres nodos y ejecuta los scripts en orden.

**Día a día:**

```bash
./levantar.sh                     # sucursales + alias de Windows
cd Api && npm run dev             # API (en Ubuntu/WSL)
cd WebSite && npm run dev         # Web
./bajar.sh                        # al terminar
```

**Usuarios de prueba:**

| Usuario | Contraseña | Rol | Sucursal |
|---|---|---|---|
| `admin.sanjose` | `Admin#2026` | Administrador | San José |
| `admin.limon` | `Admin#2026` | Administrador | Limón |
| `gerente.corporativo` | `Gerente#2026` | Corporativo | — |

---

## 12. Limitaciones conocidas

- **Regla de reparto histórico.** Los datos originales no indicaban la sucursal, así que se repartieron por la paridad del número de pedido. Las ventas nuevas sí pertenecen a la sucursal donde se crean.
- **Estadísticas con hasta 5 minutos de retraso.** El Corporativo trabaja sobre una copia consolidada. Es un retraso aceptable para informes, y se puede sincronizar en el momento desde la web.
- **Ventana al eliminar productos.** Entre la verificación de movimientos y la eliminación, una sucursal podría registrar una venta del producto. El riesgo es bajo, y la replicación reportaría el conflicto en el monitor.
- **Red de WSL.** Las direcciones de Ubuntu cambian al reiniciar. `levantar.sh` actualiza los alias de Windows automáticamente. Las sucursales usan los puertos 1436 y 1437, porque el 1434 está reservado para la conexión de administración (DAC) de SQL Server en Windows.