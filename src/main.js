import './styles.css';
import {
  getConfig,
  setConfig,
  getCatalogo,
  getPresentaciones,
  catalogoInicial,
  getVentas,
  registrarVenta,
  marcarCancelada,
  pendientes,
  descargarCatalogo,
  subirCatalogoInicial,
  sincronizar,
  fechaLocal,
} from './data.js';
import { esc, money, norm, imgSrc, agotado as estaAgotado } from './marca.js';
import qrcode from 'qrcode-generator';
import { ML_BASE, tamanos, precioEn, descuentoRelleno } from './presentaciones.js';

/* ---------- Utilidades ---------- */

const $ = (s, el = document) => el.querySelector(s);
const num = (v) => {
  const n = parseFloat(String(v).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const vibrar = (ms = 12) => navigator.vibrate && navigator.vibrate(ms);

const ICON = {
  bag: '<svg viewBox="0 0 24 24"><path d="M6 7h12l1 13H5L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  wa: '<svg viewBox="0 0 24 24"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8L4 20Z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2L9 9.5Z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  refill: '<svg viewBox="0 0 24 24"><path d="M9 3h6M10 3v3M14 3v3M8 6h8l1 3v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9l1-3Z"/><path d="M10 14.5a2 2 0 1 0 4 0c0-1.3-2-3.5-2-3.5s-2 2.2-2 3.5Z"/></svg>',
  sync: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4"/></svg>',
};

const FILTROS = ['Todos', 'Más vendidos', 'Hombre', 'Mujer', 'Dulce', 'Fresco', 'Amaderado', 'Floral', 'Nocturno'];
const METODOS = ['Efectivo', 'Tarjeta', 'Transferencia'];
const PUNTOS = ['Sucursal', 'Tianguis'];

/* ---------- Estado ---------- */

const state = {
  vista: 'vender',
  filtro: 'Todos',
  q: '',
  carrito: [],
  tabla: getPresentaciones(),
  ml: Number(localStorage.getItem('fs.ml')) || ML_BASE,
  catalogo: getCatalogo(),
  fuenteCatalogo: localStorage.getItem('fs.catalogo') ? 'hoja' : 'integrado',
  cobro: { descuento: 0, descTipo: '$', metodo: 'Efectivo', recibido: '', notas: '' },
  sync: 'ok',
  syncError: '',
  verVentas: 'hoy',
};

/* ---------- Toast ---------- */

let toastTimer;
function toast(msg, tipo = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast show ${tipo}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = 'toast'), 2200);
}

/* ---------- Esqueleto ---------- */

function montar() {
  $('#app').innerHTML = `
    <header class="top">
      <img class="brand" src="brand-header.jpg" alt="FreshStyle Perfumería" />
      <div class="top-right">
        <button class="pill" data-action="ir" data-vista="ajustes" id="who"></button>
        <button class="sync-dot" data-action="sincronizar" id="sync" aria-label="Sincronizar"></button>
      </div>
    </header>
    <main id="view"></main>
    <div id="cartbar"></div>
    <nav class="tabs" id="tabs"></nav>
    <div id="modal"></div>
    <div id="dialog"></div>
    <div id="toast" class="toast"></div>`;
  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
}

function render() {
  const c = getConfig();
  $('#who').textContent = `${c.vendedor || 'Vendedor'} · ${c.punto}`;
  renderSync();
  renderTabs();
  const v = $('#view');
  if (state.vista === 'vender') v.innerHTML = vistaVender();
  if (state.vista === 'ventas') v.innerHTML = vistaVentas();
  if (state.vista === 'ajustes') v.innerHTML = vistaAjustes();
  if (state.vista === 'vender') renderGrid();
  renderCartbar();
}

function renderTabs() {
  const tab = (id, icon, label) =>
    `<button class="${state.vista === id ? 'on' : ''}" data-action="ir" data-vista="${id}">${icon}<span>${label}</span></button>`;
  $('#tabs').innerHTML = tab('vender', ICON.bag, 'Vender') + tab('ventas', ICON.list, 'Ventas') + tab('ajustes', ICON.gear, 'Ajustes');
}

function renderSync() {
  const n = pendientes();
  const el = $('#sync');
  let cls = 'ok';
  let txt = '';
  if (!getConfig().apiUrl) cls = 'off';
  else if (state.sync === 'enviando') cls = 'busy';
  else if (state.sync === 'error') cls = 'err';
  else if (n) cls = 'warn';
  if (n) txt = String(n);
  el.className = `sync-dot ${cls}`;
  el.innerHTML = `${ICON.sync}${txt ? `<b>${txt}</b>` : ''}`;
  el.title =
    cls === 'off' ? 'Sin conexión a Google Sheets' : cls === 'err' ? state.syncError : n ? `${n} por enviar` : 'Todo enviado';
}

/* ---------- Vender ---------- */

function vistaVender() {
  return `
    <div class="search">${ICON.search}<input id="q" type="search" placeholder="Buscar perfume…" value="${esc(state.q)}" autocomplete="off" /></div>
    <div class="chips" id="filtros">${FILTROS.map(
      (f) => `<button class="chip ${state.filtro === f ? 'on' : ''}" data-action="filtro" data-f="${f}">${f}</button>`,
    ).join('')}</div>
    <div class="pres-bar">
      <span class="lbl">Presentación</span>
      <div class="seg pres" id="pres">${tamanos(state.tabla)
        .map((ml) => `<button class="${state.ml === ml ? 'on' : ''}" data-action="ml" data-ml="${ml}">${ml} ml</button>`)
        .join('')}</div>
    </div>
    <div class="grid" id="grid"></div>`;
}

function filtrar() {
  const q = norm(state.q.trim());
  const f = state.filtro;
  return state.catalogo.filter((p) => {
    if (p.activo === false) return false;
    if (q && !norm(`${p.nombre} ${p.descripcion} ${(p.familias || []).join(' ')}`).includes(q)) return false;
    if (f === 'Todos') return true;
    if (f === 'Más vendidos') return p.mas_vendido;
    if (f === 'Hombre' || f === 'Mujer') return p.genero === f;
    return (p.familias || []).includes(f);
  });
}

function renderGrid() {
  const lista = filtrar();
  const enCarrito = {};
  state.carrito.forEach((i) => (enCarrito[i.id] = (enCarrito[i.id] || 0) + i.cantidad));
  $('#grid').innerHTML = lista.length
    ? lista
        .map((p) => {
          const agotado = estaAgotado(p);
          const stock =
            p.stock === null || p.stock === undefined ? '' : `<span class="stock ${agotado ? 'out' : ''}">${agotado ? 'Agotado' : `Quedan ${p.stock}`}</span>`;
          return `
          <div class="card ${agotado ? 'agotado' : ''}" data-action="agregar" data-id="${esc(p.id)}">
            <div class="ph"><img loading="lazy" src="${esc(imgSrc(p))}" alt="" />
              ${p.mas_vendido ? '<span class="top">Top</span>' : ''}
              ${enCarrito[p.id] ? `<span class="qty">${enCarrito[p.id]}</span>` : ''}
              <button class="info" data-action="detalle" data-id="${esc(p.id)}" aria-label="Ver detalle">${ICON.info}</button>
            </div>
            <div class="meta">
              <span class="g">${esc(p.genero)}</span>
              <h3>${esc(p.nombre)}</h3>
              <div class="row"><b class="price">${money(precioEn(p, state.ml, state.tabla))}</b>${stock}</div>
            </div>
          </div>`;
        })
        .join('')
    : `<p class="empty">No hay perfumes con “${esc(state.q)}”.</p>`;
}

/* ---------- Líneas de venta (presentación y envase rellenado) ---------- */

const claveLinea = (i) => (i.id ? `${i.id}|${i.ml}|${i.rellenado ? 1 : 0}` : i.key);
const descLinea = (i) => (i.rellenado && i.ml ? descuentoRelleno(i.ml, state.tabla) : 0);
const unitario = (i) => Math.max(0, i.precio - descLinea(i));
const nombreLinea = (i) => (i.ml ? `${i.nombre} ${i.ml} ml${i.rellenado ? ' (rellenado)' : ''}` : i.nombre);

// Tras cambiar presentación o rellenado, une líneas que quedaron iguales.
function normalizarCarrito() {
  const unidas = [];
  for (const i of state.carrito) {
    i.key = claveLinea(i);
    const igual = unidas.find((x) => x.key === i.key);
    if (igual) igual.cantidad += i.cantidad;
    else unidas.push(i);
  }
  state.carrito = unidas;
}

function agregar(id, cantidad = 1, ml = state.ml) {
  const p = state.catalogo.find((x) => x.id === id);
  if (!p) return;
  const nuevo = { id, nombre: p.nombre, ml, rellenado: false, precio: precioEn(p, ml, state.tabla), cantidad, imagen: p.imagen };
  const item = state.carrito.find((i) => i.key === claveLinea(nuevo));
  if (item) item.cantidad += cantidad;
  else state.carrito.push({ ...nuevo, key: claveLinea(nuevo) });
  vibrar();
  if (state.vista === 'vender') renderGrid();
  renderCartbar(true);
}

function renderCartbar(bump = false) {
  const bar = $('#cartbar');
  const piezas = state.carrito.reduce((s, i) => s + i.cantidad, 0);
  if (!piezas || state.vista !== 'vender') {
    bar.className = '';
    bar.innerHTML = '';
    return;
  }
  const total = state.carrito.reduce((s, i) => s + i.cantidad * unitario(i), 0);
  bar.className = `cartbar ${bump ? 'bump' : ''}`;
  bar.innerHTML = `
    <button class="cart-sum" data-action="cobrar"><span class="badge">${piezas}</span>${piezas === 1 ? 'pieza' : 'piezas'} · <b>${money(total)}</b></button>
    <button class="btn primary" data-action="cobrar">Cobrar</button>`;
  if (bump) setTimeout(() => bar.classList.remove('bump'), 300);
}

/* ---------- Modales ---------- */

function abrirModal(html, cls = '') {
  $('#modal').innerHTML = `<div class="overlay" data-action="cerrar-fondo"><div class="sheet ${cls}" role="dialog">${html}</div></div>`;
  document.body.classList.add('locked');
}
function cerrarModal() {
  $('#modal').innerHTML = '';
  document.body.classList.remove('locked');
}

function modalDetalle(id) {
  const p = state.catalogo.find((x) => x.id === id);
  if (!p) return;
  abrirModal(
    `
    <button class="close" data-action="cerrar">${ICON.x}</button>
    <div class="det-img"><img src="${esc(imgSrc(p))}" alt="" /></div>
    <div class="det">
      <span class="g">${esc(p.genero)} · ${esc((p.familias || []).join(' · '))}</span>
      <h2>${esc(p.nombre)}</h2>
      <p>${esc(p.descripcion)}</p>
      <div class="lbl">Agregar a la venta</div>
      <div class="pres-grid">${tamanos(state.tabla)
        .map(
          (ml) => `<button class="pres-btn ${ml === state.ml ? 'on' : ''}" data-action="agregar-cerrar" data-id="${esc(p.id)}" data-ml="${ml}">
            <span>${ml} ml</span><b>${money(precioEn(p, ml, state.tabla))}</b></button>`,
        )
        .join('')}</div>
    </div>`,
    'detalle',
  );
}

function totales() {
  const subtotal = state.carrito.reduce((s, i) => s + i.cantidad * unitario(i), 0);
  const c = state.cobro;
  const descuento = Math.min(subtotal, c.descTipo === '%' ? Math.round((subtotal * num(c.descuento)) / 100) : num(c.descuento));
  const total = subtotal - descuento;
  const recibido = num(c.recibido);
  const rellenos = state.carrito.reduce((s, i) => s + i.cantidad * descLinea(i), 0);
  return { subtotal, descuento, rellenos, total, recibido, cambio: recibido - total };
}

function modalCobro() {
  if (!state.carrito.length) return cerrarModal();
  const c = state.cobro;
  const t = totales();
  const efectivo = c.metodo === 'Efectivo';
  const falta = efectivo && c.recibido !== '' && t.recibido < t.total;
  const rapidos = [...new Set([t.total, ...[100, 200, 500, 1000].filter((b) => b > t.total).slice(0, 3)])];
  abrirModal(
    `
    <div class="sheet-head">
      <h2>Venta</h2>
      <button class="link" data-action="vaciar">Vaciar</button>
      <button class="close" data-action="cerrar">${ICON.x}</button>
    </div>
    <div class="sheet-body">
      <ul class="lines">${state.carrito
        .map(
          (i) => `
        <li>
          <img src="${esc(imgSrc(i))}" alt="" />
          <div class="ln">
            <span>${esc(i.nombre)}</span>
            <label class="pe">$<input inputmode="decimal" data-precio="${esc(i.key)}" value="${i.precio}" aria-label="Precio" /></label>
          </div>
          <div class="stepper">
            <button data-action="menos" data-key="${esc(i.key)}" aria-label="Quitar uno">${ICON.minus}</button>
            <b>${i.cantidad}</b>
            <button data-action="mas" data-key="${esc(i.key)}" aria-label="Agregar uno">${ICON.plus}</button>
          </div>
          ${
            i.ml
              ? `<div class="ln-opts">
            <div class="ml-chips">${tamanos(state.tabla)
              .map(
                (ml) =>
                  `<button class="${i.ml === ml ? 'on' : ''}" data-action="linea-ml" data-key="${esc(i.key)}" data-ml="${ml}">${ml}</button>`,
              )
              .join('')}<span>ml</span></div>
            <button class="relleno ${i.rellenado ? 'on' : ''}" data-action="relleno" data-key="${esc(i.key)}" aria-pressed="${i.rellenado}">
              ${ICON.refill} Envase rellenado <b>−${money(descuentoRelleno(i.ml, state.tabla))}</b>
            </button>
          </div>`
              : ''
          }
        </li>`,
        )
        .join('')}</ul>
      <button class="btn ghost small" data-action="libre">${ICON.plus} Artículo libre</button>

      <div class="block">
        <div class="lbl">Descuento</div>
        <div class="desc">
          <div class="seg mini">${['$', '%']
            .map((x) => `<button class="${c.descTipo === x ? 'on' : ''}" data-action="desc-tipo" data-t="${x}">${x}</button>`)
            .join('')}</div>
          <input id="descuento" inputmode="decimal" placeholder="0" value="${esc(c.descuento || '')}" />
        </div>
      </div>

      <div class="block">
        <div class="lbl">Método de pago</div>
        <div class="seg">${METODOS.map(
          (m) => `<button class="${c.metodo === m ? 'on' : ''}" data-action="metodo" data-m="${m}">${m}</button>`,
        ).join('')}</div>
      </div>

      ${
        efectivo
          ? `<div class="block">
        <div class="lbl">Recibido</div>
        <input id="recibido" inputmode="decimal" placeholder="${t.total}" value="${esc(c.recibido)}" />
        <div class="quick">${rapidos
          .map((b) => `<button class="chip" data-action="recibido" data-v="${b}">${b === t.total ? 'Exacto' : money(b)}</button>`)
          .join('')}</div>
      </div>`
          : ''
      }

      <div class="block">
        <input id="notas" placeholder="Notas (cliente, teléfono…) — opcional" value="${esc(c.notas)}" />
      </div>

      <dl class="tot" id="tot">${htmlTotales(t, efectivo)}</dl>
    </div>
    <div class="sheet-foot">
      <button class="btn primary block-btn" data-action="confirmar" ${falta ? 'disabled' : ''} id="confirmar">Cobrar ${money(t.total)}</button>
    </div>`,
    'cobro',
  );
}

function htmlTotales(t, efectivo) {
  return `
    <div><dt>Productos</dt><dd>${money(t.subtotal + t.rellenos)}</dd></div>
    ${t.rellenos ? `<div class="chg"><dt>Envases rellenados</dt><dd>−${money(t.rellenos)}</dd></div>` : ''}
    ${t.descuento ? `<div><dt>Descuento</dt><dd>−${money(t.descuento)}</dd></div>` : ''}
    <div class="grand"><dt>Total</dt><dd>${money(t.total)}</dd></div>
    ${
      efectivo && state.cobro.recibido !== ''
        ? `<div class="${t.cambio < 0 ? 'neg' : 'chg'}"><dt>${t.cambio < 0 ? 'Falta' : 'Cambio'}</dt><dd>${money(Math.abs(t.cambio))}</dd></div>`
        : ''
    }`;
}

// Recalcula totales sin redibujar el modal (para no perder el foco del teclado).
function refrescarTotales() {
  const t = totales();
  const efectivo = state.cobro.metodo === 'Efectivo';
  $('#tot').innerHTML = htmlTotales(t, efectivo);
  const b = $('#confirmar');
  b.textContent = `Cobrar ${money(t.total)}`;
  b.disabled = efectivo && state.cobro.recibido !== '' && t.recibido < t.total;
}

function modalLibre() {
  abrirModal(
    `
    <div class="sheet-head"><h2>Artículo libre</h2><button class="close" data-action="cobrar">${ICON.x}</button></div>
    <div class="sheet-body">
      <p class="muted">Para tamaños especiales, decants u otros productos que no están en el catálogo.</p>
      <input id="libre-nombre" placeholder="Descripción" />
      <input id="libre-precio" inputmode="decimal" placeholder="Precio" />
    </div>
    <div class="sheet-foot"><button class="btn primary block-btn" data-action="libre-ok">Agregar</button></div>`,
    'cobro',
  );
  $('#libre-nombre').focus();
}

async function confirmarVenta() {
  const t = totales();
  const c = state.cobro;
  const venta = registrarVenta({
    items: state.carrito.map((i) => ({
      id: i.id,
      nombre: nombreLinea(i),
      precio: unitario(i),
      cantidad: i.cantidad,
      ml: i.ml || null,
      rellenado: !!i.rellenado,
      descRelleno: descLinea(i),
    })),
    descuento: t.descuento,
    metodo: c.metodo,
    recibido: c.metodo === 'Efectivo' && c.recibido !== '' ? t.recibido : null,
    notas: c.notas.trim(),
  });
  state.carrito = [];
  state.cobro = { descuento: 0, descTipo: '$', metodo: c.metodo, recibido: '', notas: '' };
  vibrar(40);
  modalExito(venta);
  render();
  await intentarSync();
  if ($('#exito-estado')) $('#exito-estado').innerHTML = estadoVenta(venta.folio);
}

function estadoVenta(folio) {
  const v = getVentas().find((x) => x.folio === folio);
  if (!getConfig().apiUrl) return '<span class="st warn">Guardada en este celular · configura Google Sheets en Ajustes</span>';
  return v && v.enviada
    ? `<span class="st ok">${ICON.check} Guardada en Google Sheets</span>`
    : '<span class="st warn">Guardada en el celular · se enviará al haber señal</span>';
}

function modalExito(v) {
  abrirModal(
    `
    <div class="exito">
      <div class="ok-ring">${ICON.check}</div>
      <h2>¡Venta registrada!</h2>
      <p class="folio">${esc(v.folio)} · ${esc(v.metodo)}</p>
      <div class="big-total">${money(v.total)}</div>
      ${v.cambio !== null ? `<div class="cambio">Cambio <b>${money(v.cambio)}</b></div>` : ''}
      <div id="exito-estado">${estadoVenta(v.folio)}</div>
      <div class="exito-btns">
        <a class="btn ghost" href="${linkWhatsApp(v)}" target="_blank" rel="noopener">${ICON.wa} Enviar ticket</a>
        <button class="btn primary" data-action="cerrar">Nueva venta</button>
      </div>
    </div>`,
    'exito-sheet',
  );
}

function textoTicket(v) {
  const lineas = v.items.map((i) => `• ${i.cantidad} × ${i.nombre} — ${money(i.precio * i.cantidad)}`).join('\n');
  return [
    '✨ *FreshStyle Perfumería* ✨',
    `Folio: ${v.folio}`,
    `${v.fecha} ${v.hora} · ${v.punto}`,
    '',
    lineas,
    '',
    v.descuento ? `Descuento: −${money(v.descuento)}` : null,
    `*Total: ${money(v.total)}* (${v.metodo})`,
    v.cambio !== null ? `Recibido: ${money(v.recibido)} · Cambio: ${money(v.cambio)}` : null,
    '',
    `Te atendió: ${v.vendedor}`,
    '¡Gracias por tu compra! 🖤',
  ]
    .filter((x) => x !== null)
    .join('\n');
}

const linkWhatsApp = (v) => `https://wa.me/?text=${encodeURIComponent(textoTicket(v))}`;

// Confirmación dentro de la app (más clara en celular que el diálogo del navegador).
function pedirConfirmacion(mensaje, si = 'Confirmar', peligro = false) {
  return new Promise((resolve) => {
    const d = $('#dialog');
    d.innerHTML = `
      <div class="overlay dlg"><div class="dialog" role="alertdialog" aria-modal="true">
        <p>${esc(mensaje)}</p>
        <div class="dialog-btns">
          <button class="btn ghost" id="dlg-no">Regresar</button>
          <button class="btn ${peligro ? 'danger' : 'primary'}" id="dlg-si">${esc(si)}</button>
        </div>
      </div></div>`;
    const fin = (v) => (e) => {
      e.stopPropagation();
      d.innerHTML = '';
      resolve(v);
    };
    $('#dlg-no').onclick = fin(false);
    $('#dlg-si').onclick = fin(true);
    $('#dlg-si').focus();
  });
}

function modalOnboarding() {
  const c = getConfig();
  abrirModal(
    `
    <div class="onb">
      <img src="icon-192.png" alt="" class="onb-logo" />
      <h2>Bienvenido a FreshStyle POS</h2>
      <p class="muted">Tu nombre aparece en cada venta registrada.</p>
      <input id="onb-nombre" placeholder="¿Quién vende hoy?" value="${esc(c.vendedor)}" autocomplete="name" />
      <div class="lbl">Punto de venta</div>
      <div class="seg">${PUNTOS.map(
        (p) => `<button class="${c.punto === p ? 'on' : ''}" data-action="onb-punto" data-p="${p}">${p}</button>`,
      ).join('')}</div>
      <button class="btn primary block-btn" data-action="onb-ok">Comenzar</button>
    </div>`,
    'onb-sheet',
  );
}

/* ---------- Ventas ---------- */

function vistaVentas() {
  const hoy = fechaLocal();
  const todas = getVentas();
  const lista = state.verVentas === 'hoy' ? todas.filter((v) => v.fecha === hoy) : todas;
  const pagadas = lista.filter((v) => v.estado !== 'Cancelada');
  const total = pagadas.reduce((s, v) => s + v.total, 0);
  const piezas = pagadas.reduce((s, v) => s + v.items.reduce((a, i) => a + i.cantidad, 0), 0);
  const porMetodo = METODOS.map((m) => [m, pagadas.filter((v) => v.metodo === m).reduce((s, v) => s + v.total, 0)]);
  const n = pendientes();
  return `
    <div class="seg wide">${[
      ['hoy', 'Hoy'],
      ['todas', 'Historial'],
    ]
      .map(([k, l]) => `<button class="${state.verVentas === k ? 'on' : ''}" data-action="ver-ventas" data-k="${k}">${l}</button>`)
      .join('')}</div>
    <section class="kpis">
      <div class="kpi main"><span>Total ${state.verVentas === 'hoy' ? 'de hoy' : ''}</span><b>${money(total)}</b></div>
      <div class="kpi"><span>Tickets</span><b>${pagadas.length}</b></div>
      <div class="kpi"><span>Piezas</span><b>${piezas}</b></div>
    </section>
    <section class="metodos">${porMetodo.map(([m, v]) => `<div><span>${m}</span><b>${money(v)}</b></div>`).join('')}</section>
    ${
      n
        ? `<div class="banner warn">${n} ${n === 1 ? 'movimiento' : 'movimientos'} sin enviar a Google Sheets
             <button class="btn small" data-action="sincronizar">Enviar ahora</button></div>`
        : ''
    }
    ${state.syncError && state.sync === 'error' ? `<div class="banner err">${esc(state.syncError)}</div>` : ''}
    <ul class="tickets">${
      lista.length
        ? lista
            .map(
              (v) => `
      <li class="${v.estado === 'Cancelada' ? 'cancel' : ''}" data-action="ticket" data-folio="${esc(v.folio)}">
        <div class="t1"><b>${money(v.total)}</b><span>${esc(v.fecha === hoy ? v.hora : `${v.fecha} ${v.hora}`)}</span></div>
        <div class="t2">${esc(v.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(', '))}</div>
        <div class="t3"><span>${esc(v.metodo)} · ${esc(v.vendedor)}</span>${
          v.estado === 'Cancelada'
            ? '<span class="st err">Cancelada</span>'
            : v.enviada
              ? `<span class="st ok">${ICON.check} Enviada</span>`
              : '<span class="st warn">Pendiente</span>'
        }</div>
      </li>`,
            )
            .join('')
        : '<p class="empty">Aún no hay ventas. ¡A vender! 🔥</p>'
    }</ul>
    <p class="muted small center">Ventas registradas en este celular. El total de todo el equipo está en la pestaña “Resumen” de tu Google Sheet.</p>`;
}

function modalTicket(folio) {
  const v = getVentas().find((x) => x.folio === folio);
  if (!v) return;
  abrirModal(
    `
    <div class="sheet-head"><h2>Ticket</h2><button class="close" data-action="cerrar">${ICON.x}</button></div>
    <div class="sheet-body"><pre class="ticket">${esc(textoTicket(v))}</pre></div>
    <div class="sheet-foot two">
      ${v.estado !== 'Cancelada' ? `<button class="btn danger" data-action="cancelar-venta" data-folio="${esc(v.folio)}">Cancelar venta</button>` : ''}
      <a class="btn primary" href="${linkWhatsApp(v)}" target="_blank" rel="noopener">${ICON.wa} WhatsApp</a>
    </div>`,
    'cobro',
  );
}

/* ---------- Ajustes ---------- */

// Si la app no se publicó con APPS_SCRIPT_URL, el enlace lleva el id del script para que el catálogo lea la hoja.
const urlCatalogo = () => {
  const url = new URL('catalogo.html', location.href);
  const id = getConfig().apiUrl.match(/\/macros\/s\/([\w-]+)\/exec/);
  if (id && getConfig().apiUrl !== __APPS_SCRIPT_URL__) url.searchParams.set('s', id[1]);
  return url.href;
};

function qrCatalogo() {
  const qr = qrcode(0, 'M');
  qr.addData(urlCatalogo());
  qr.make();
  return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
}

function vistaAjustes() {
  const c = getConfig();
  const otroPunto = !PUNTOS.includes(c.punto);
  return `
    <section class="card-sec">
      <h3>Vendedor</h3>
      <input id="cfg-vendedor" placeholder="Tu nombre" value="${esc(c.vendedor)}" />
      <div class="lbl">Punto de venta</div>
      <div class="seg">${PUNTOS.map(
        (p) => `<button class="${c.punto === p ? 'on' : ''}" data-action="punto" data-p="${p}">${p}</button>`,
      ).join('')}<button class="${otroPunto ? 'on' : ''}" data-action="punto" data-p="">Otro</button></div>
      ${otroPunto ? `<input id="cfg-punto" placeholder="Nombre del lugar (ej. Tianguis del domingo)" value="${esc(c.punto)}" />` : ''}
    </section>

    <section class="card-sec">
      <h3>Google Sheets</h3>
      <label class="lbl" for="cfg-api">URL de Apps Script (termina en /exec)</label>
      <input id="cfg-api" inputmode="url" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(c.apiUrl)}" />
      <label class="lbl" for="cfg-pin">PIN (si lo configuraste en el script)</label>
      <input id="cfg-pin" inputmode="numeric" placeholder="Opcional" value="${esc(c.pin)}" />
      <div class="btn-row">
        <button class="btn" data-action="probar">Probar y actualizar catálogo</button>
        ${c.sheetUrl ? `<a class="btn ghost" href="${esc(c.sheetUrl)}" target="_blank" rel="noopener">Abrir hoja</a>` : ''}
      </div>
      <p class="muted small">Catálogo: <b>${state.catalogo.length}</b> perfumes · fuente: ${
        state.fuenteCatalogo === 'hoja' ? 'Google Sheet' : 'integrado en la app'
      }</p>
      <button class="btn ghost small" data-action="cargar-catalogo">Subir catálogo inicial a la hoja</button>
    </section>

    <section class="card-sec">
      <h3>Catálogo para clientes</h3>
      <p class="muted small">Que tus clientes escaneen este código para ver los perfumes y pedir por WhatsApp. Precios y existencias salen de la hoja.</p>
      <div class="qr">${qrCatalogo()}</div>
      <div class="btn-row">
        <a class="btn" href="catalogo.html" target="_blank" rel="noopener">Abrir catálogo</a>
        <button class="btn ghost" data-action="compartir-catalogo">Compartir</button>
      </div>
    </section>

    <section class="card-sec">
      <h3>Equipo</h3>
      <p class="muted small">Envía este enlace a tus compañeros: abre la app ya conectada a la hoja.</p>
      <button class="btn" data-action="compartir" ${c.apiUrl ? '' : 'disabled'}>Compartir configuración</button>
    </section>

    <section class="card-sec">
      <h3>Sin señal</h3>
      <p class="muted small">Las ventas se guardan en el celular y se envían solas cuando vuelve la conexión. Descarga las fotos para verlas sin internet.</p>
      <button class="btn ghost" data-action="precargar">Descargar fotos (${state.catalogo.length})</button>
    </section>
    <p class="muted small center">FreshStyle POS · dispositivo ${esc(c.dispositivo)}</p>`;
}

/* ---------- Sincronización ---------- */

async function intentarSync({ silencioso = true } = {}) {
  if (!getConfig().apiUrl || !pendientes()) {
    if (!silencioso && !getConfig().apiUrl) toast('Configura la URL de Apps Script en Ajustes', 'err');
    renderSync();
    return;
  }
  state.sync = 'enviando';
  renderSync();
  try {
    await sincronizar();
    state.sync = 'ok';
    state.syncError = '';
    if (!silencioso) toast('Todo enviado a Google Sheets ✓', 'ok');
  } catch (e) {
    state.sync = 'error';
    state.syncError = navigator.onLine ? `No se pudo enviar: ${e.message}` : 'Sin señal: las ventas se enviarán después';
    if (!silencioso) toast(state.syncError, 'err');
  }
  renderSync();
  if (state.vista === 'ventas') render();
}

async function actualizarCatalogo({ silencioso = true } = {}) {
  if (!getConfig().apiUrl) return;
  try {
    const productos = await descargarCatalogo();
    if (productos.length) {
      state.catalogo = productos;
      state.fuenteCatalogo = 'hoja';
      state.tabla = getPresentaciones();
    }
    if (!silencioso)
      toast(productos.length ? `Conectado ✓ ${productos.length} perfumes` : 'Conectado ✓ La hoja Catalogo está vacía', 'ok');
    if (state.vista !== 'vender' || !silencioso) render();
    else renderGrid();
  } catch (e) {
    if (!silencioso) toast(`No se pudo conectar: ${e.message}`, 'err');
  }
}

/* ---------- Eventos ---------- */

function guardarAjustes() {
  const val = (id) => ($(id) ? $(id).value.trim() : undefined);
  const cambios = {};
  if ($('#cfg-vendedor')) cambios.vendedor = val('#cfg-vendedor');
  if ($('#cfg-api')) cambios.apiUrl = val('#cfg-api');
  if ($('#cfg-pin')) cambios.pin = val('#cfg-pin');
  if ($('#cfg-punto')) cambios.punto = val('#cfg-punto') || 'Otro';
  setConfig(cambios);
  $('#who').textContent = `${getConfig().vendedor || 'Vendedor'} · ${getConfig().punto}`;
}

function cambiarCantidad(key, d) {
  const i = state.carrito.find((x) => x.key === key);
  if (!i) return;
  i.cantidad += d;
  if (i.cantidad <= 0) state.carrito = state.carrito.filter((x) => x !== i);
  vibrar(8);
  modalCobro();
  renderCartbar();
}

async function onClick(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  if (a === 'cerrar-fondo') {
    if (e.target === el && !$('.onb')) cerrarModal(), render();
    return;
  }
  e.stopPropagation();
  switch (a) {
    case 'ir':
      state.vista = el.dataset.vista;
      window.scrollTo(0, 0);
      render();
      break;
    case 'filtro':
      state.filtro = el.dataset.f;
      document.querySelectorAll('#filtros .chip').forEach((c) => c.classList.toggle('on', c === el));
      renderGrid();
      break;
    case 'agregar':
      if (el.classList.contains('agotado') && !(await pedirConfirmacion('Este perfume aparece agotado. ¿Venderlo de todos modos?', 'Vender'))) return;
      agregar(el.dataset.id);
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 250);
      break;
    case 'detalle':
      modalDetalle(el.dataset.id);
      break;
    case 'agregar-cerrar':
      agregar(el.dataset.id, 1, Number(el.dataset.ml) || state.ml);
      cerrarModal();
      toast('Agregado ✓');
      break;
    case 'cerrar':
      cerrarModal();
      render();
      break;
    case 'cobrar':
      modalCobro();
      break;
    case 'vaciar':
      if (await pedirConfirmacion('¿Vaciar la venta?', 'Vaciar', true)) {
        state.carrito = [];
        cerrarModal();
        render();
      }
      break;
    case 'ml':
      state.ml = Number(el.dataset.ml);
      try {
        localStorage.setItem('fs.ml', state.ml);
      } catch {
        /* sin almacenamiento */
      }
      document.querySelectorAll('#pres button').forEach((b) => b.classList.toggle('on', b === el));
      renderGrid();
      break;
    case 'linea-ml': {
      const i = state.carrito.find((x) => x.key === el.dataset.key);
      const p = i && state.catalogo.find((x) => x.id === i.id);
      if (!i || !p) return;
      i.ml = Number(el.dataset.ml);
      i.precio = precioEn(p, i.ml, state.tabla);
      normalizarCarrito();
      modalCobro();
      renderCartbar();
      break;
    }
    case 'relleno': {
      const i = state.carrito.find((x) => x.key === el.dataset.key);
      if (!i) return;
      i.rellenado = !i.rellenado;
      normalizarCarrito();
      vibrar(8);
      modalCobro();
      renderCartbar();
      break;
    }
    case 'mas':
      cambiarCantidad(el.dataset.key, 1);
      break;
    case 'menos':
      cambiarCantidad(el.dataset.key, -1);
      break;
    case 'desc-tipo':
      state.cobro.descTipo = el.dataset.t;
      modalCobro();
      break;
    case 'metodo':
      state.cobro.metodo = el.dataset.m;
      modalCobro();
      break;
    case 'recibido':
      state.cobro.recibido = el.dataset.v;
      modalCobro();
      break;
    case 'libre':
      modalLibre();
      break;
    case 'libre-ok': {
      const nombre = $('#libre-nombre').value.trim() || 'Artículo libre';
      const precio = num($('#libre-precio').value);
      if (!precio) return toast('Escribe el precio', 'err');
      state.carrito.push({ key: `libre-${Date.now()}`, id: '', nombre, ml: null, rellenado: false, precio, cantidad: 1, imagen: '' });
      modalCobro();
      renderCartbar();
      break;
    }
    case 'confirmar':
      if (!getConfig().vendedor) return modalOnboarding();
      el.disabled = true;
      await confirmarVenta();
      break;
    case 'ticket':
      modalTicket(el.dataset.folio);
      break;
    case 'cancelar-venta':
      if (!(await pedirConfirmacion('¿Cancelar esta venta? Quedará marcada como “Cancelada” en la hoja.', 'Cancelar venta', true))) return;
      marcarCancelada(el.dataset.folio);
      cerrarModal();
      render();
      intentarSync();
      break;
    case 'ver-ventas':
      state.verVentas = el.dataset.k;
      render();
      break;
    case 'sincronizar':
      await intentarSync({ silencioso: false });
      if (!pendientes() && state.sync === 'ok' && getConfig().apiUrl) toast('Todo enviado a Google Sheets ✓', 'ok');
      break;
    case 'punto':
      setConfig({ punto: el.dataset.p || (PUNTOS.includes(getConfig().punto) ? 'Otro' : getConfig().punto) });
      render();
      if (!el.dataset.p) $('#cfg-punto')?.select();
      break;
    case 'probar':
      guardarAjustes();
      el.disabled = true;
      el.textContent = 'Conectando…';
      await actualizarCatalogo({ silencioso: false });
      intentarSync();
      break;
    case 'cargar-catalogo':
      guardarAjustes();
      if (!(await pedirConfirmacion(`Se cargarán ${catalogoInicial().length} perfumes en la hoja “Catalogo” (solo si está vacía).`, 'Subir catálogo'))) return;
      try {
        el.disabled = true;
        const r = await subirCatalogoInicial();
        toast(`Catálogo cargado: ${r.cargados} perfumes ✓`, 'ok');
        await actualizarCatalogo();
      } catch (err) {
        toast(err.message, 'err');
      }
      render();
      break;
    case 'compartir': {
      const c = getConfig();
      const cfg = btoa(unescape(encodeURIComponent(JSON.stringify({ apiUrl: c.apiUrl, pin: c.pin, sheetUrl: c.sheetUrl }))));
      const url = `${location.origin}${location.pathname}#cfg=${cfg}`;
      if (navigator.share) navigator.share({ title: 'FreshStyle POS', text: 'Abre el punto de venta FreshStyle:', url }).catch(() => {});
      else {
        await navigator.clipboard?.writeText(url).catch(() => {});
        toast('Enlace copiado ✓');
      }
      break;
    }
    case 'compartir-catalogo': {
      const url = urlCatalogo();
      if (navigator.share) navigator.share({ title: 'FreshStyle Perfumería', text: 'Mira nuestro catálogo de perfumes:', url }).catch(() => {});
      else {
        await navigator.clipboard?.writeText(url).catch(() => {});
        toast('Enlace copiado ✓');
      }
      break;
    }
    case 'precargar':
      precargarFotos(el);
      break;
    case 'onb-punto':
      setConfig({ punto: el.dataset.p });
      el.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === el));
      break;
    case 'onb-ok': {
      const nombre = $('#onb-nombre').value.trim();
      if (!nombre) return toast('Escribe tu nombre', 'err');
      setConfig({ vendedor: nombre });
      cerrarModal();
      render();
      break;
    }
  }
}

function onInput(e) {
  const t = e.target;
  if (t.id === 'q') {
    state.q = t.value;
    renderGrid();
  } else if (t.id === 'descuento') {
    state.cobro.descuento = t.value;
    refrescarTotales();
  } else if (t.id === 'recibido') {
    state.cobro.recibido = t.value;
    refrescarTotales();
  } else if (t.id === 'notas') {
    state.cobro.notas = t.value;
  } else if (t.dataset.precio) {
    const i = state.carrito.find((x) => x.key === t.dataset.precio);
    if (i) i.precio = num(t.value);
    refrescarTotales();
    renderCartbar();
  }
}

function onChange(e) {
  if (e.target.id?.startsWith('cfg-')) {
    guardarAjustes();
    toast('Guardado ✓');
  }
}

async function precargarFotos(btn) {
  const urls = state.catalogo.map(imgSrc);
  let n = 0;
  btn.disabled = true;
  for (const u of urls) {
    await fetch(u).catch(() => {});
    btn.textContent = `Descargando… ${++n}/${urls.length}`;
  }
  btn.textContent = 'Fotos listas para usar sin señal ✓';
}

/* ---------- Arranque ---------- */

function leerConfigCompartida() {
  const m = location.hash.match(/cfg=([^&]+)/);
  if (!m) return;
  try {
    const cfg = JSON.parse(decodeURIComponent(escape(atob(m[1]))));
    setConfig({ apiUrl: cfg.apiUrl || '', pin: cfg.pin || '', sheetUrl: cfg.sheetUrl || getConfig().sheetUrl });
    history.replaceState(null, '', location.pathname);
    setTimeout(() => toast('Conectado a la hoja del equipo ✓', 'ok'), 400);
  } catch {
    /* enlace dañado: se ignora */
  }
}

leerConfigCompartida();
montar();
render();
if (!getConfig().vendedor) modalOnboarding();
actualizarCatalogo();
intentarSync();
window.addEventListener('online', () => intentarSync());
setInterval(() => pendientes() && intentarSync(), 60000);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
