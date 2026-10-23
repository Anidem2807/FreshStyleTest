/**
 * FreshStyle POS — conector con Google Sheets.
 *
 * Instalación (una sola vez):
 *   1. En tu Google Sheet: Extensiones → Apps Script. Borra lo que haya y pega este archivo.
 *   2. (Opcional) Cambia PIN abajo por un código que solo conozcan tus vendedores.
 *   3. Ejecuta la función `configurar` (botón ▶) y acepta los permisos.
 *   4. Implementar → Nueva implementación → Tipo: Aplicación web
 *        Ejecutar como: Yo   ·   Quién tiene acceso: Cualquier persona
 *      Copia la URL que termina en /exec y pégala en la app (Ajustes).
 *
 * Al actualizar desde una versión anterior, vuelve a ejecutar `configurar` (agrega lo nuevo sin borrar nada).
 * Si después editas este código: Implementar → Gestionar implementaciones → ✏️ → Versión: Nueva.
 */

const PIN = ''; // Ej. '2468'. Protege registrar y cancelar ventas. Vacío = sin PIN.

const HOJAS = {
  catalogo: {
    nombre: 'Catalogo',
    columnas: ['ID', 'Nombre', 'Género', 'Familias', 'Precio', 'Descripción', 'Imagen', 'Más vendido', 'Activo', 'Stock'],
  },
  ventas: {
    nombre: 'Ventas',
    columnas: ['Folio', 'Fecha', 'Hora', 'Vendedor', 'Punto de venta', 'Productos', 'Piezas', 'Subtotal', 'Descuento',
      'Total', 'Método de pago', 'Recibido', 'Cambio', 'Notas', 'Estado', 'Dispositivo', 'Registrado'],
  },
  detalle: {
    nombre: 'Detalle',
    columnas: ['Folio', 'Fecha', 'Vendedor', 'Punto de venta', 'ID producto', 'Producto', 'Cantidad', 'Precio unitario',
      'Importe', 'Estado', 'Presentación (ml)', 'Envase rellenado', 'Desc. rellenado'],
  },
};

// Precio por presentación según el precio de 35 ml (columnas $160, $180…) y descuento por envase rellenado.
const PRESENTACIONES = [
  ['Presentación (ml)', 'Descuento rellenado', '$160', '$180'],
  [16, 15, 90, 100],
  [25, 20, 120, 135],
  [35, 20, 160, 180],
  [60, 20, 250, 280],
];

/* ---------- Instalación ---------- */

function configurar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HOJAS).forEach((k) => hoja_(k));
  const ventas = hoja_('ventas');
  ventas.getRange('B:B').setNumberFormat('yyyy-mm-dd');
  ventas.getRange('H:M').setNumberFormat('$#,##0.00');
  hoja_('detalle').getRange('H:I').setNumberFormat('$#,##0.00');
  hoja_('catalogo').getRange('E:E').setNumberFormat('$#,##0.00');

  if (!ss.getSheetByName('Presentaciones')) {
    const pr = ss.insertSheet('Presentaciones');
    pr.getRange(1, 1, PRESENTACIONES.length, PRESENTACIONES[0].length).setValues(PRESENTACIONES);
    pr.getRange(1, 1, 1, PRESENTACIONES[0].length).setFontWeight('bold').setBackground('#1a1515').setFontColor('#d9b46a');
    pr.setFrozenRows(1);
    pr.getRange(2, 2, PRESENTACIONES.length - 1, PRESENTACIONES[0].length - 1).setNumberFormat('$#,##0');
    pr.getRange('A7').setValue('Para otro precio de 35 ml agrega una columna (ej. $200). Si un precio no está, la app lo calcula en proporción.');
  }

  let resumen = ss.getSheetByName('Resumen');
  if (!resumen) {
    resumen = ss.insertSheet('Resumen');
    resumen.getRange('A1').setValue('Ventas por día').setFontWeight('bold');
    resumen.getRange('A2').setFormula(
      "=IFERROR(QUERY(Ventas!A:O,\"select B, count(A), sum(G), sum(J) where O = 'Pagada' group by B order by B desc " +
      "label B 'Fecha', count(A) 'Tickets', sum(G) 'Piezas', sum(J) 'Total'\",1),\"Sin ventas aún\")");
    resumen.getRange('G1').setValue('Ventas por vendedor (mes actual)').setFontWeight('bold');
    resumen.getRange('G2').setFormula(
      "=IFERROR(QUERY(Ventas!A:O,\"select D, count(A), sum(J) where O = 'Pagada' and B >= date '\"&TEXT(EOMONTH(TODAY(),-1)+1,\"yyyy-mm-dd\")&\"' " +
      "group by D order by sum(J) desc label D 'Vendedor', count(A) 'Tickets', sum(J) 'Total'\",1),\"Sin ventas aún\")");
    resumen.getRange('K1').setValue('Más vendidos').setFontWeight('bold');
    resumen.getRange('K2').setFormula(
      "=IFERROR(QUERY(Detalle!A:J,\"select F, sum(G), sum(I) where J = 'Pagada' group by F order by sum(G) desc " +
      "limit 20 label F 'Producto', sum(G) 'Piezas', sum(I) 'Importe'\",1),\"Sin ventas aún\")");
  }
  const hoja1 = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (hoja1 && hoja1.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(hoja1);
}

function hoja_(clave) {
  const def = HOJAS[clave];
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(def.nombre);
  if (!sh) sh = ss.insertSheet(def.nombre);
  const actuales = sh.getLastRow() === 0 ? 0 : sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].filter(String).length;
  if (actuales < def.columnas.length) {
    // Hoja nueva o de una versión anterior: agrega los encabezados que falten al final.
    sh.getRange(1, actuales + 1, 1, def.columnas.length - actuales).setValues([def.columnas.slice(actuales)])
      .setFontWeight('bold').setBackground('#1a1515').setFontColor('#d9b46a');
    sh.setFrozenRows(1);
  }
  return sh;
}

/* ---------- API ---------- */

// El catálogo es público (lo usa también el catálogo para clientes); el PIN protege solo las escrituras.
function doGet() {
  return json_({ ok: true, productos: leerCatalogo_(), presentaciones: leerPresentaciones_() });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'Solicitud inválida' });
  }
  if (PIN && body.pin !== PIN) return json_({ ok: false, error: 'PIN incorrecto' });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    switch (body.action) {
      case 'ventas': return json_(guardarVentas_(body.ventas || []));
      case 'cancelar': return json_(cancelarVenta_(body.folio));
      case 'cargarCatalogo': return json_(cargarCatalogo_(body.productos || []));
      default: return json_({ ok: false, error: 'Acción desconocida' });
    }
  } finally {
    lock.releaseLock();
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- Catálogo ---------- */

function leerCatalogo_() {
  const sh = hoja_('catalogo');
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  const filas = sh.getRange(2, 1, n, HOJAS.catalogo.columnas.length).getValues();
  return filas.filter((f) => f[0] !== '' && f[1] !== '').map((f) => ({
    id: String(f[0]),
    nombre: String(f[1]),
    genero: String(f[2]),
    familias: String(f[3]).split(',').map((s) => s.trim()).filter(String),
    precio: Number(f[4]) || 0,
    descripcion: String(f[5]),
    imagen: String(f[6]),
    mas_vendido: esSi_(f[7]),
    activo: f[8] === '' ? true : esSi_(f[8]),
    stock: f[9] === '' ? null : Number(f[9]),
  }));
}

function leerPresentaciones_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Presentaciones');
  if (!sh || sh.getLastRow() < 2) return null;
  const datos = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  const niveles = datos[0].slice(2).map((h) => Number(String(h).replace(/[^\d.]/g, '')));
  const filas = datos.slice(1).filter((f) => Number(f[0]) > 0).map((f) => {
    const precios = {};
    niveles.forEach((n, k) => {
      if (n && f[k + 2] !== '') precios[n] = Number(f[k + 2]);
    });
    return { ml: Number(f[0]), relleno: Number(f[1]) || 0, precios: precios };
  });
  return filas.length ? { filas: filas } : null;
}

function esSi_(v) {
  return v === true || /^(s[ií]|true|1|x)$/i.test(String(v).trim());
}

// Carga el catálogo inicial de la app, solo si la hoja Catalogo está vacía.
function cargarCatalogo_(productos) {
  const sh = hoja_('catalogo');
  if (sh.getLastRow() > 1) return { ok: false, error: 'La hoja Catalogo ya tiene productos' };
  const filas = productos.map((p) => [p.id, p.nombre, p.genero, (p.familias || []).join(', '), p.precio,
    p.descripcion, p.imagen, p.mas_vendido ? 'Sí' : 'No', 'Sí', '']);
  if (filas.length) sh.getRange(2, 1, filas.length, filas[0].length).setValues(filas);
  return { ok: true, cargados: filas.length };
}

/* ---------- Ventas ---------- */

function guardarVentas_(ventas) {
  const shV = hoja_('ventas');
  const shD = hoja_('detalle');
  const existentes = new Set(columna_(shV, 1));
  const guardados = [];
  const filasV = [];
  const filasD = [];
  const vendidas = {};
  const ahora = new Date();

  ventas.forEach((v) => {
    if (!v || !v.folio) return;
    guardados.push(v.folio); // también se confirman los repetidos (reintentos sin conexión)
    if (existentes.has(v.folio)) return;
    existentes.add(v.folio);
    const items = v.items || [];
    filasV.push([v.folio, v.fecha, v.hora, v.vendedor, v.punto, items.map((i) => i.cantidad + '× ' + i.nombre).join(', '),
      items.reduce((s, i) => s + i.cantidad, 0), v.subtotal, v.descuento, v.total, v.metodo,
      v.recibido === null || v.recibido === undefined ? '' : v.recibido,
      v.cambio === null || v.cambio === undefined ? '' : v.cambio, v.notas || '', 'Pagada', v.dispositivo || '', ahora]);
    items.forEach((i) => {
      filasD.push([v.folio, v.fecha, v.vendedor, v.punto, i.id || '', i.nombre, i.cantidad, i.precio, i.cantidad * i.precio, 'Pagada',
        i.ml || '', i.rellenado ? 'Sí' : 'No', (i.descRelleno || 0) * i.cantidad]);
      if (i.id) vendidas[i.id] = (vendidas[i.id] || 0) + i.cantidad;
    });
  });

  if (filasV.length) shV.getRange(shV.getLastRow() + 1, 1, filasV.length, filasV[0].length).setValues(filasV);
  if (filasD.length) shD.getRange(shD.getLastRow() + 1, 1, filasD.length, filasD[0].length).setValues(filasD);
  ajustarStock_(vendidas, -1);
  return { ok: true, guardados: guardados };
}

function cancelarVenta_(folio) {
  if (!folio) return { ok: false, error: 'Falta folio' };
  const shV = hoja_('ventas');
  const folios = columna_(shV, 1);
  const idx = folios.indexOf(folio);
  if (idx < 0) return { ok: false, error: 'No existe el folio ' + folio };
  const colEstado = HOJAS.ventas.columnas.indexOf('Estado') + 1;
  const celda = shV.getRange(idx + 2, colEstado);
  if (celda.getValue() === 'Cancelada') return { ok: true };
  celda.setValue('Cancelada');

  const shD = hoja_('detalle');
  const n = shD.getLastRow() - 1;
  const devueltas = {};
  if (n > 0) {
    const colEstadoD = HOJAS.detalle.columnas.indexOf('Estado') + 1;
    const filas = shD.getRange(2, 1, n, HOJAS.detalle.columnas.length).getValues();
    filas.forEach((f, k) => {
      if (f[0] !== folio) return;
      shD.getRange(k + 2, colEstadoD).setValue('Cancelada');
      if (f[4]) devueltas[f[4]] = (devueltas[f[4]] || 0) + Number(f[6]);
    });
  }
  ajustarStock_(devueltas, 1);
  return { ok: true };
}

// Inventario: solo descuenta en productos con un número en la columna Stock.
function ajustarStock_(cantidades, signo) {
  const ids = Object.keys(cantidades);
  if (!ids.length) return;
  const sh = hoja_('catalogo');
  const n = sh.getLastRow() - 1;
  if (n < 1) return;
  const colStock = HOJAS.catalogo.columnas.indexOf('Stock') + 1;
  const idsHoja = sh.getRange(2, 1, n, 1).getValues().map((f) => String(f[0]));
  const stock = sh.getRange(2, colStock, n, 1).getValues();
  let cambio = false;
  idsHoja.forEach((id, k) => {
    if (cantidades[id] && stock[k][0] !== '') {
      stock[k][0] = Number(stock[k][0]) + signo * cantidades[id];
      cambio = true;
    }
  });
  if (cambio) sh.getRange(2, colStock, n, 1).setValues(stock);
}

function columna_(sh, col) {
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, col, n, 1).getValues().map((f) => String(f[0]));
}
