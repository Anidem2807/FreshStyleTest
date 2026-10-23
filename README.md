# FreshStyle POS

Punto de venta para celular de **FreshStyle Perfumería**, para vender en sucursal o en tianguis. Cada venta se registra en Google Sheets.

- **149 perfumes** tomados del catálogo del sitio, con foto, descripción, precio, género, familia (dulce, fresco, amaderado, floral, nocturno) y la etiqueta de más vendidos.
- Venta rápida: tocas la foto para agregar, aplicas descuento y eliges el método de pago (efectivo, tarjeta o transferencia). En efectivo calcula el cambio.
- **Funciona sin señal.** Las ventas se guardan en el celular y se envían solas a la hoja cuando vuelve la conexión, sin duplicarse.
- Ticket por WhatsApp, cancelación de ventas, "artículo libre" para decants o tamaños especiales, y precio editable en cada venta.
- Cada venta lleva el nombre del vendedor y el punto de venta.
- Se instala en la pantalla de inicio del celular como una app (PWA).
- **Base para inventario:** si escribes un número en la columna `Stock` de la hoja, ese producto se descuenta solo con cada venta.

## Presentaciones y envase rellenado

Se vende en **16, 25, 35 y 60 ml**. El precio del catálogo es el de **35 ml** y los demás salen de la pestaña **Presentaciones** de la hoja:

| Presentación | Rellenado | Perfumes de $160 | Perfumes de $180 |
|---|---|---|---|
| 16 ml | −$15 | $90 | $100 |
| 25 ml | −$20 | $120 | $135 |
| 35 ml | −$20 | $160 | $180 |
| 60 ml | −$20 | $250 | $280 |

- **Al vender:** elige la presentación arriba del catálogo y todos los precios cambian. En el cobro, cada perfume se puede cambiar de tamaño y marcar como **Envase rellenado**, que aplica el descuento de ese tamaño.
- **En la hoja:** la pestaña *Detalle* guarda la presentación, si fue rellenado y el descuento aplicado.
- **Si cambian los precios:** edita la pestaña *Presentaciones*. Para otro nivel de precio agrega una columna (por ejemplo `$200`). Si un perfume tiene un precio que no está en la tabla, la app calcula sus otras presentaciones en proporción, redondeado a $5.
- **Catálogo de clientes:** muestra "desde $90" en cada perfume y el cliente elige la presentación al agregarlo a su pedido.

## 1. Conectar Google Sheets (una sola vez, ~5 min)

1. Abre tu hoja → **Extensiones → Apps Script**.
2. Borra el contenido y pega todo [`apps-script/Code.gs`](apps-script/Code.gs). Guarda.
3. (Opcional) Escribe un PIN en `const PIN = ''`, por ejemplo `'2468'`.
4. Elige la función **`configurar`** y presiona ▶ **Ejecutar**. Acepta los permisos: *Configuración avanzada → Ir a … (no seguro)* es normal porque el script es tuyo. Esto crea las pestañas `Catalogo`, `Ventas`, `Detalle` y `Resumen`.
5. **Implementar → Nueva implementación → ⚙ Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
6. Copia la URL que termina en **`/exec`**.

En la app: **Ajustes →** pega la URL (y el PIN, si pusiste uno) **→ "Subir catálogo inicial a la hoja"**. Desde ese momento el catálogo se administra en la hoja.

> Si después cambias el código del script: **Implementar → Gestionar implementaciones → ✏️ → Versión: Nueva**. Así la URL no cambia.

### ¿Qué guarda cada pestaña?

| Pestaña | Contenido |
|---|---|
| **Catalogo** | Los perfumes. Puedes editar precio, nombre o descripción; poner `No` en *Activo* para ocultar uno; agregar perfumes nuevos (en *Imagen* puedes pegar un enlace de Google Drive); y poner *Stock* para llevar inventario. |
| **Ventas** | Un renglón por ticket: folio, fecha, vendedor, punto de venta, productos, total, método de pago, cambio y estado (Pagada o Cancelada). |
| **Detalle** | Un renglón por producto vendido. Sirve para los reportes y el inventario. |
| **Resumen** | Ventas por día, ventas por vendedor del mes y los productos más vendidos. Se calcula solo. |

La app lee el catálogo de la hoja cada vez que se abre. Para que tome cambios al momento, usa **Ajustes → Probar y actualizar catálogo**.

## Catálogo para clientes

`catalogo.html` es la vitrina pública: tus clientes buscan por nombre o aroma, filtran por hombre/mujer y familia, ven la descripción y arman un pedido que se envía por WhatsApp a Eduardo o a Aarón.

- Lo encuentras en la app de ventas, en **Ajustes → Catálogo para clientes**, con un **código QR** para imprimir o mostrar en el puesto, y botones para abrirlo o compartirlo.
- Toma precios, perfumes activos y existencias de la hoja `Catalogo`: lo que ocultes (Activo = No) desaparece y lo que tenga Stock 0 sale como "Agotado".
- Los números de WhatsApp y las redes están en `src/marca.js`.
- Para que el catálogo lea la hoja, define la variable `APPS_SCRIPT_URL` en GitHub (ver abajo), o compártelo desde **Ajustes**: ese enlace y el QR ya llevan la conexión.

> Si actualizas `Code.gs` desde una versión anterior: pega el código nuevo, ejecuta otra vez **`configurar`** (agrega la pestaña *Presentaciones* y las columnas nuevas sin borrar nada) y crea una **nueva versión** de la implementación.

## 2. Compartir con tus vendedores

En **Ajustes → Compartir configuración** se genera un enlace que abre la app ya conectada a la hoja. Mándalo por WhatsApp. Cada quien escribe su nombre la primera vez y luego, en el celular, elige *Agregar a pantalla de inicio*.

## 3. Publicar la app

Es un sitio estático que se compila a la carpeta `dist/`. Se publica en **GitHub Pages** con `.github/workflows/static.yml`, que compila y publica en cada push.

1. **Settings → Pages → Source: GitHub Actions**.
2. Haz push (o merge a `main`). La app queda en `https://<usuario>.github.io/FreshStyleTest/`.
3. (Opcional) En **Settings → Secrets and variables → Actions → Variables**, crea `APPS_SCRIPT_URL` y `Sheet`. Así la app ya sale conectada y nadie tiene que pegar la URL.

GitHub Pages en repos privados requiere un plan de pago. Otra opción gratis es arrastrar la carpeta `dist/` a [Netlify Drop](https://app.netlify.com/drop).

## Desarrollo

```bash
npm install
cp .env.example .env   # Sheet y APPS_SCRIPT_URL
npm run dev            # http://localhost:5173 (y en tu red local para probar en el celular)
npm run build          # genera dist/
```

- `src/catalog.json` + `public/img/`: catálogo integrado, extraído del sitio. Solo se usa mientras la hoja `Catalogo` está vacía.
- `src/data.js`: almacenamiento local, cola de ventas pendientes y conexión con Apps Script.
- `src/main.js` / `src/styles.css`: la interfaz. La paleta está en `:root` de `styles.css`: negro carbón, brasas naranjas y dorado de la flor de lis, como en el catálogo.
- `apps-script/Code.gs`: el código que vive en tu Google Sheet.

## Pendientes de revisar en el catálogo

Estos perfumes **no tienen precio en el sitio**, así que se cargaron con **$160**. Corrígelos en la hoja si es necesario:
212 VIP Black, Armani Code, Asad Bourbon, Ferragamo, Invictus Acqua, Invictus Legend, Lacoste Red, Light Blue (Hombre), Spicebomb Extreme, Valentino Uomo Intense, 212, 5th Avenue, Amarige Givenchy, Anaïs Anaïs, Bebé, Fame Couture, Mod Vainilla, Valentino Donna Green, Very Good Girl, Yum Yum.

Ocho perfumes aparecían en el sitio solo con foto, sin nombre en el texto. Se nombraron según su imagen: Scandal Pour Homme, 1 Million, 1 Million Lucky, Polo Blue, Acqua di Giò, Acqua di Giò Profondo, Tommy y Valentino Born in Roma Intense.
