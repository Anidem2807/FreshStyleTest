// Estado local (localStorage) + comunicación con Google Sheets vía Apps Script.
import catalogoBase from './catalog.json';
import { PRESENTACIONES_BASE } from './presentaciones.js';

const K = {
  config: 'fs.config',
  catalogo: 'fs.catalogo',
  presentaciones: 'fs.presentaciones',
  ventas: 'fs.ventas',
  seq: 'fs.seq',
};

const leer = (k, def) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : def;
  } catch {
    return def;
  }
};
const guardar = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* almacenamiento lleno o bloqueado: la app sigue en memoria */
  }
};

/* ---------- Configuración ---------- */

const codigoDispositivo = () => Math.random().toString(36).slice(2, 5).toUpperCase();

export function getConfig() {
  const c = leer(K.config, {});
  const config = {
    vendedor: '',
    punto: 'Sucursal',
    apiUrl: __APPS_SCRIPT_URL__,
    pin: '',
    sheetUrl: __SHEET_URL__,
    dispositivo: '',
    ...c,
  };
  if (!config.dispositivo) {
    config.dispositivo = codigoDispositivo();
    guardar(K.config, config);
  }
  return config;
}

export function setConfig(cambios) {
  const c = { ...getConfig(), ...cambios };
  guardar(K.config, c);
  return c;
}

/* ---------- Catálogo ---------- */

export function getCatalogo() {
  return leer(K.catalogo, null) || catalogoBase.map((p) => ({ ...p, activo: true, stock: null }));
}

export const catalogoInicial = () => catalogoBase;

export const getPresentaciones = () => leer(K.presentaciones, null) || PRESENTACIONES_BASE;

/* ---------- Ventas (historial local + cola de envío) ---------- */

export const getVentas = () => leer(K.ventas, []);
const setVentas = (v) => guardar(K.ventas, v.slice(0, 1000));

const pad = (n, l = 2) => String(n).padStart(l, '0');

export function fechaLocal(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nuevoFolio(config, d) {
  const hoy = fechaLocal(d).replace(/-/g, '').slice(2);
  const seq = leer(K.seq, { dia: '', n: 0 });
  const n = seq.dia === hoy ? seq.n + 1 : 1;
  guardar(K.seq, { dia: hoy, n });
  return `FS${hoy}-${config.dispositivo}-${pad(n, 3)}`;
}

export function registrarVenta({ items, descuento, metodo, recibido, notas }) {
  const config = getConfig();
  const d = new Date();
  const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const total = Math.max(0, subtotal - descuento);
  const venta = {
    folio: nuevoFolio(config, d),
    fecha: fechaLocal(d),
    hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    ts: d.getTime(),
    vendedor: config.vendedor,
    punto: config.punto,
    items: items.map(({ id, nombre, precio, cantidad, ml = null, rellenado = false, descRelleno = 0 }) => ({
      id,
      nombre,
      precio,
      cantidad,
      ml,
      rellenado,
      descRelleno,
    })),
    subtotal,
    descuento,
    total,
    metodo,
    recibido: metodo === 'Efectivo' && recibido ? recibido : null,
    cambio: metodo === 'Efectivo' && recibido ? recibido - total : null,
    notas: notas || '',
    dispositivo: config.dispositivo,
    estado: 'Pagada',
    enviada: false,
    cancelacionPendiente: false,
  };
  setVentas([venta, ...getVentas()]);
  return venta;
}

export function marcarCancelada(folio) {
  setVentas(getVentas().map((v) => (v.folio === folio ? { ...v, estado: 'Cancelada', cancelacionPendiente: true } : v)));
}

export const pendientes = () => getVentas().filter((v) => !v.enviada || v.cancelacionPendiente).length;

/* ---------- Apps Script ---------- */

async function post(body) {
  const { apiUrl, pin } = getConfig();
  if (!apiUrl) throw new Error('Falta la URL de Apps Script (Ajustes)');
  // text/plain evita el "preflight" CORS que Apps Script no acepta.
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...body, pin }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Error en Google Sheets');
  return data;
}

export async function descargarCatalogo() {
  const { apiUrl, pin } = getConfig();
  if (!apiUrl) throw new Error('Falta la URL de Apps Script (Ajustes)');
  const url = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}pin=${encodeURIComponent(pin)}&t=${Date.now()}`;
  const data = await (await fetch(url)).json();
  if (!data.ok) throw new Error(data.error || 'Error en Google Sheets');
  if (data.productos.length) guardar(K.catalogo, data.productos);
  if (data.presentaciones && data.presentaciones.filas.length) guardar(K.presentaciones, data.presentaciones);
  return data.productos;
}

export const subirCatalogoInicial = () => post({ action: 'cargarCatalogo', productos: catalogoBase });

let sincronizando = null;

// Envía ventas pendientes y cancelaciones. Seguro de repetir: la hoja ignora folios ya guardados.
export function sincronizar() {
  if (sincronizando) return sincronizando;
  sincronizando = (async () => {
    const porEnviar = getVentas().filter((v) => !v.enviada);
    if (porEnviar.length) {
      const { guardados } = await post({ action: 'ventas', ventas: porEnviar });
      const ok = new Set(guardados);
      setVentas(getVentas().map((v) => (ok.has(v.folio) ? { ...v, enviada: true } : v)));
    }
    for (const v of getVentas().filter((x) => x.enviada && x.cancelacionPendiente)) {
      await post({ action: 'cancelar', folio: v.folio });
      setVentas(getVentas().map((x) => (x.folio === v.folio ? { ...x, cancelacionPendiente: false } : x)));
    }
  })().finally(() => {
    sincronizando = null;
  });
  return sincronizando;
}
