# Proyecto 2 — Base de datos distribuida (Wide World Importers)

**Bases de Datos II** · Alice Arias Salazar y Heldyis Agüero Espinoza · Prof. Cristian Paz Campos Agüero

La empresa tiene **una oficina central (Corporativo) y dos sucursales (San José y Limón)**. En lugar de una sola base de datos, cada lugar tiene la suya, y las tres trabajan juntas. Se usa la aplicación web del Proyecto 1, adaptada a este modelo.

---

## 1. Los tres nodos

| Nodo | Dónde corre | Qué guarda |
|---|---|---|
| **Corporativo** (Escazú) | SQL Server en **Windows** | Datos privados de clientes y proveedores, el catálogo de productos original, los usuarios y una copia de las ventas de las dos sucursales para los reportes |
| **San José** | SQL Server en **Linux** (Docker), puerto 1436 | Sus ventas, su inventario y una copia del catálogo |
| **Limón** | SQL Server en **Linux** (Docker), puerto 1437 | Sus ventas, su inventario y una copia del catálogo |

```
                 CORPORATIVO (Windows)
           datos privados · catálogo · reportes
              /                        \
   replicación y linked servers   replicación y linked servers
            /                            \
   SAN JOSÉ (Linux)                  LIMÓN (Linux)
   sus ventas e inventario           sus ventas e inventario

   Web (React) → API (Node.js) → el nodo del usuario que inició sesión
```

---

## 2. Conceptos principales

### Fragmentación: repartir los datos

Fragmentar es **partir una tabla** para que cada nodo guarde solo lo que le corresponde.

- **Vertical (por columnas):** de clientes, proveedores y personas se separaron los **datos privados**: teléfonos, direcciones, contactos y datos bancarios. Esas columnas **se borraron de las sucursales** y solo existen en el Corporativo. Si alguien entra a una sucursal, ahí no hay datos privados.
- **Horizontal (por filas):** cada sucursal guarda **solo sus propias ventas**. Como los datos originales no decían de qué sucursal era cada venta, se repartieron así:
  - pedido con número **par** → San José
  - pedido con número **impar** → Limón
  - la factura y sus líneas van con su pedido, para que nunca queden separados.
- **Inventario:** cada sucursal tiene sus propias existencias (se repartieron mitad y mitad).

Las ventas nuevas quedan en la sucursal donde se hacen. Cada sucursal usa su propio rango de números de factura (San José desde 10 000 000 y Limón desde 20 000 000), así nunca se repiten.

**Comprobación:** al sumar las facturas de las dos sucursales da exactamente el total original (70 510). No falta ninguna y ninguna está repetida.

### Replicación: el mismo catálogo en todas partes

El **catálogo de productos** (nombre, precio, proveedor, colores, empaques) tiene que ser igual en los tres nodos. Para eso se usa la **replicación transaccional** de SQL Server:

1. Los productos se crean, modifican o eliminan **solo en el Corporativo**.
2. SQL Server copia el cambio automáticamente a San José y Limón en pocos segundos.

Aunque el Administrador cree el producto desde su sucursal, la sucursal se lo envía al Corporativo y espera a que regrese la copia.

### Linked servers: que los nodos se hablen

Un **linked server** es un "enlace" que permite a un SQL Server consultar a otro como si fuera propio.

- Cada sucursal tiene el enlace **CORPORATIVO**, para enviar productos y pedir datos privados con permiso.
- El Corporativo tiene los enlaces **LS_SANJOSE** y **LS_LIMON**, para traer las ventas de las sucursales a los reportes.

Los enlaces no usan `sa`: usan logins propios con permisos limitados.

### Sinónimos: no importa dónde esté el dato

Los procedimientos del Proyecto 1 usan nombres como `Facturas` o `ClientesActuales`. Esos nombres son **sinónimos** que apuntan a la tabla real, esté en el mismo nodo o en otro. Por eso los procedimientos casi no cambiaron.

---

## 3. Usuarios y seguridad

- **Tabla de usuarios** en el Corporativo, con la contraseña **cifrada** (AES-256, cifrado propio de SQL Server). Nunca se guarda en texto normal.
- **Dos roles:**
  - **Administrador:** ve clientes, proveedores, inventario y ventas de **su** sucursal. Puede crear, modificar y eliminar productos. Clientes y proveedores son solo de consulta.
  - **Corporativo:** ve los reportes de una sucursal o de las dos juntas, y aprueba las solicitudes de acceso.
- **La API nunca usa `sa`.** Según quién inició sesión, se conecta con un login que **solo puede ejecutar procedimientos**, no leer tablas.
- **Datos privados con permiso:** el Administrador los ve como `xxxx`. Puede pedir acceso, y si el Corporativo lo aprueba, los ve durante unas horas. La regla la revisa la base de datos, no solo la pantalla.

---

## 4. Reportes

- Cada 5 minutos, un trabajo automático (job de SQL Server Agent) **trae al Corporativo las ventas nuevas** de las sucursales. También se puede hacer al momento con el botón de la web.
- Los **11 reportes** del Proyecto 1 tienen un filtro: **Consolidado, San José o Limón**.
- **Vistas materializadas:** SQL Server guarda algunos totales ya calculados (ventas por mes, ganancia por producto) y los actualiza solo cuando entran ventas. Los reportes más pesados también usan **tablas de resumen**, que se recalculan solo cuando hay datos nuevos. Así los reportes responden al instante en lugar de tardar casi un minuto.
- Se pueden descargar en **Excel**.

---

## 5. Si un nodo se cae

| Qué se cae | Qué pasa |
|---|---|
| **Una sucursal** | La otra sigue funcionando normal. En los reportes aparece "sin conexión" y se muestran sus últimos datos. No se pueden eliminar productos, porque no se puede revisar si tienen ventas ahí |
| **El Corporativo** | Las sucursales siguen vendiendo y consultando. No se puede iniciar sesión, cambiar productos ni ver datos privados |
| **Vuelve el nodo** | La replicación y la sincronización se ponen al día solas |

---

## 6. Dos personas a la vez (concurrencia)

- Todos los cambios del catálogo se hacen en **un solo lugar** (el Corporativo), así que dos sucursales nunca chocan.
- Si dos administradores editan el **mismo producto** al mismo tiempo, el segundo que guarda recibe el aviso *"Otro usuario modificó este producto"* y no se borra el cambio del primero.
- No se pueden crear dos productos con el mismo nombre al mismo tiempo.

---

## 7. Cómo ejecutarlo

La instalación completa en una computadora nueva está en **[INSTALACION.md](INSTALACION.md)** (`./instalar_todo.sh` instala todo en orden).

**Día a día** (en Ubuntu):

```bash
./levantar.sh                  # enciende las sucursales
cd Api && npm run dev          # API
cd WebSite && npm run dev      # Web → http://localhost:5173
./bajar.sh                     # al terminar
```

`Api/.env` se copia de `Api/.env.ejemplo`. Las contraseñas van entre comillas y este archivo **no se sube a GitHub**.

**Usuarios de prueba:**

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin.sanjose` | `Admin#2026` | Administrador de San José |
| `admin.limon` | `Admin#2026` | Administrador de Limón |
| `gerente.corporativo` | `Gerente#2026` | Corporativo |

---

## 8. Scripts (`Script/`)

Se ejecutan en orden. Los de sucursal son los mismos para San José y Limón.

| # | Nodo | Qué hace |
|---|---|---|
| 01 | Corporativo | Marca cada venta con su sucursal |
| 02 | Sucursales | Fragmentación: quita datos privados y deja solo sus ventas |
| 03 | Corporativo | Login para que las sucursales entren al Corporativo |
| 04 | Sucursales | Linked server hacia el Corporativo |
| 05 | Sucursales | Login para que el Corporativo entre a las sucursales |
| 06 | Corporativo | Linked servers hacia las sucursales |
| 07 | Los tres | Prepara el catálogo para replicarse |
| 08 | Corporativo | Replicación del catálogo |
| 09 | Corporativo | Tabla de usuarios con contraseña cifrada |
| 10 | Corporativo | Logins y permisos de la API |
| 11 | Sucursales | Login y permisos de la API |
| 12 | Sucursales | Sinónimos |
| 13 | Sucursales | Procedimientos del Proyecto 1 adaptados |
| 14 | Corporativo | Crear, modificar y eliminar productos |
| 15 | Sucursales | Productos desde la sucursal |
| 16 | Corporativo | Sincronización y reportes |
| 17 | Corporativo | Solicitudes de acceso a datos privados |

`Script/Proyecto1_original/` guarda los scripts del Proyecto 1 solo como referencia: **no se ejecutan**.

---

## 9. Limitaciones

- Las ventas viejas se repartieron por número par o impar, porque los datos originales no decían la sucursal.
- Los reportes pueden tener hasta 5 minutos de atraso (o se actualizan con el botón).
- Los tres SQL Server corren en una misma laptop, así que la primera vez que se abre un reporte puede tardar un poco más.