// Catálogo para clientes: ver perfumes, armar un pedido y enviarlo por WhatsApp.
import './styles.css';
import './catalogo.css';
import catalogoBase from './catalog.json';
import { VENDEDORES, REDES, FAMILIAS, esc, money, norm, imgSrc, agotado } from './marca.js';

const $ = (s) => document.querySelector(s);
const CACHE = 'fs.catalogo.clientes';
const PEDIDO = 'fs.pedido';

const leer = (k, def) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? def;
  } catch {
    return def;
  }
};
const guardar = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* sin almacenamiento: el pedido vive solo en esta visita */
  }
};

// La URL de la hoja viene de la compilación o del enlace/QR que comparte el vendedor (?s=<id>).
const idScript = new URLSearchParams(location.search).get('s');
const apiUrl = __APPS_SCRIPT_URL__ || (idScript ? `https://script.google.com/macros/s/${idScript}/exec` : '');

const state = {
  productos: leer(CACHE, null) || catalogoBase,
  filtro: 'Todos',
  genero: '',
  q: '',
  pedido: leer(PEDIDO, {}), // { id: cantidad }
};

const visibles = () => state.productos.filter((p) => p.activo !== false);
const porId = (id) => state.productos.find((p) => p.id === id);

/* ---------- Estructura ---------- */

function montar() {
  const desde = Math.min(...visibles().map((p) => p.precio).filter(Boolean));
  $('#app').innerHTML = `
    <header class="hero">
      <img class="hero-logo" src="brand-header.jpg" alt="FreshStyle Perfumería" />
      <p class="hero-line">Fragancias inspiradas en las grandes casas</p>
      <p class="hero-sub">Elige tus favoritos y pídelos por WhatsApp · desde <b>${money(desde)}</b></p>
    </header>

    <div class="sticky">
      <div class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="q" type="search" placeholder="Busca por nombre o aroma: vainilla, cítrico…" autocomplete="off" />
      </div>
      <div class="gen" role="tablist">
        ${['', 'Hombre', 'Mujer']
          .map((g) => `<button class="${state.genero === g ? 'on' : ''}" data-genero="${g}">${g || 'Todos'}</button>`)
          .join('')}
      </div>
      <div class="chips">
        ${['Todos', 'Más vendidos', ...FAMILIAS]
          .map((f) => `<button class="chip ${state.filtro === f ? 'on' : ''}" data-filtro="${f}">${f}</button>`)
          .join('')}
      </div>
    </div>

    <main class="vitrina">
      <p class="conteo" id="conteo"></p>
      <div class="grid" id="grid"></div>
    </main>

    <footer class="pie">
      <img src="icon-192.png" alt="" class="pie-logo" />
      <p>¿Dudas o pedidos especiales? Escríbenos:</p>
      <div class="pie-contactos">
        ${VENDEDORES.map(
          (v) => `<a class="btn ghost" href="${waLink(v.whatsapp, 'Hola, quisiera información sobre un perfume')}" target="_blank" rel="noopener">${ICON_WA} ${esc(v.nombre)}</a>`,
        ).join('')}
      </div>
      <div class="pie-redes">
        <a href="${REDES.tiktok}" target="_blank" rel="noopener">TikTok</a>
        <a href="${REDES.facebook}" target="_blank" rel="noopener">Facebook</a>
      </div>
      <p class="muted small">Precios sujetos a cambio y disponibilidad.</p>
    </footer>

    <div id="pedido-bar"></div>
    <div id="modal"></div>
    <div id="toast" class="toast"></div>`;
}

const ICON_WA =
  '<svg viewBox="0 0 24 24"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8L4 20Z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2L9 9.5Z"/></svg>';
const ICON_X = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const ICON_PLUS = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
const ICON_MINUS = '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>';
const ICON_CHECK = '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

const waLink = (numero, texto) => `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;

/* ---------- Vitrina ---------- */

function filtrados() {
  const q = norm(state.q.trim());
  return visibles().filter((p) => {
    if (state.genero && p.genero !== state.genero) return false;
    if (state.filtro === 'Más vendidos' && !p.mas_vendido) return false;
    if (FAMILIAS.includes(state.filtro) && !(p.familias || []).includes(state.filtro)) return false;
    return !q || norm(`${p.nombre} ${p.descripcion} ${(p.familias || []).join(' ')}`).includes(q);
  }).sort((a, b) => agotado(a) - agotado(b) || b.mas_vendido - a.mas_vendido);
}

function renderGrid() {
  const lista = filtrados();
  $('#conteo').textContent = `${lista.length} ${lista.length === 1 ? 'perfume' : 'perfumes'}`;
  $('#grid').innerHTML = lista.length
    ? lista
        .map((p) => {
          const out = agotado(p);
          const n = state.pedido[p.id] || 0;
          return `
        <article class="card ${out ? 'agotado' : ''}" data-ver="${esc(p.id)}">
          <div class="ph"><img loading="lazy" src="${esc(imgSrc(p))}" alt="${esc(p.nombre)}" />
            ${p.mas_vendido ? '<span class="top">Más vendido</span>' : ''}
            ${out ? '<span class="sold">Agotado</span>' : ''}
          </div>
          <div class="meta">
            <span class="g">${esc(p.genero)} · ${esc((p.familias || [])[0] || '')}</span>
            <h3>${esc(p.nombre)}</h3>
            <div class="row">
              <b class="price">${money(p.precio)}</b>
              ${
                out
                  ? ''
                  : `<button class="add ${n ? 'on' : ''}" data-add="${esc(p.id)}" aria-label="Agregar ${esc(p.nombre)} al pedido">${n ? `${ICON_CHECK}<span>${n}</span>` : ICON_PLUS}</button>`
              }
            </div>
          </div>
        </article>`;
        })
        .join('')
    : `<p class="empty">No encontramos “${esc(state.q)}”. Prueba con otro nombre o aroma.</p>`;
}

/* ---------- Pedido ---------- */

const lineas = () =>
  Object.entries(state.pedido)
    .map(([id, cantidad]) => ({ p: porId(id), cantidad }))
    .filter((l) => l.p && l.cantidad > 0);

function cambiar(id, d) {
  const n = Math.max(0, (state.pedido[id] || 0) + d);
  if (n) state.pedido[id] = n;
  else delete state.pedido[id];
  guardar(PEDIDO, state.pedido);
  renderGrid();
  renderBarra(d > 0);
}

function renderBarra(bump = false) {
  const ls = lineas();
  const piezas = ls.reduce((s, l) => s + l.cantidad, 0);
  const bar = $('#pedido-bar');
  if (!piezas) {
    bar.className = '';
    bar.innerHTML = '';
    return;
  }
  const total = ls.reduce((s, l) => s + l.cantidad * l.p.precio, 0);
  bar.className = `cartbar tienda-bar ${bump ? 'bump' : ''}`;
  bar.innerHTML = `
    <button class="cart-sum" data-pedido><span class="badge">${piezas}</span>Mi pedido · <b>${money(total)}</b></button>
    <button class="btn primary" data-pedido>${ICON_WA} Pedir</button>`;
  if (bump) setTimeout(() => bar.classList.remove('bump'), 300);
}

function textoPedido(vendedor) {
  const ls = lineas();
  const total = ls.reduce((s, l) => s + l.cantidad * l.p.precio, 0);
  return [
    `Hola ${vendedor.nombre} 👋 Quisiera pedir del catálogo FreshStyle:`,
    '',
    ...ls.map((l) => `• ${l.cantidad} × ${l.p.nombre} — ${money(l.cantidad * l.p.precio)}`),
    '',
    `Total: ${money(total)}`,
  ].join('\n');
}

/* ---------- Modales ---------- */

function abrir(html, cls = '') {
  $('#modal').innerHTML = `<div class="overlay" data-fondo><div class="sheet ${cls}" role="dialog" aria-modal="true">${html}</div></div>`;
  document.body.classList.add('locked');
}
function cerrar() {
  $('#modal').innerHTML = '';
  document.body.classList.remove('locked');
}

function modalProducto(id) {
  const p = porId(id);
  if (!p) return;
  const out = agotado(p);
  const n = state.pedido[p.id] || 0;
  abrir(
    `
    <button class="close" data-cerrar aria-label="Cerrar">${ICON_X}</button>
    <div class="det-img"><img src="${esc(imgSrc(p))}" alt="${esc(p.nombre)}" /></div>
    <div class="det">
      <span class="g">${esc(p.genero)} · ${esc((p.familias || []).join(' · '))}</span>
      <h2>${esc(p.nombre)}</h2>
      <p>${esc(p.descripcion)}</p>
      <div class="det-foot">
        <b class="price big">${money(p.precio)}</b>
        ${
          out
            ? '<span class="st err">Agotado por ahora</span>'
            : `<button class="btn primary" data-add-cerrar="${esc(p.id)}">${n ? `Agregar otro (${n})` : 'Agregar al pedido'}</button>`
        }
      </div>
      <a class="btn ghost" href="${waLink(VENDEDORES[0].whatsapp, `Hola, me interesa el perfume ${p.nombre} (${money(p.precio)}). ¿Está disponible?`)}" target="_blank" rel="noopener">${ICON_WA} Preguntar por este perfume</a>
    </div>`,
    'detalle',
  );
}

function modalPedido() {
  const ls = lineas();
  if (!ls.length) return cerrar();
  const total = ls.reduce((s, l) => s + l.cantidad * l.p.precio, 0);
  abrir(
    `
    <div class="sheet-head"><h2>Mi pedido</h2><button class="close" data-cerrar aria-label="Cerrar">${ICON_X}</button></div>
    <div class="sheet-body">
      <ul class="lines">${ls
        .map(
          (l) => `
        <li>
          <img src="${esc(imgSrc(l.p))}" alt="" />
          <div class="ln"><span>${esc(l.p.nombre)}</span><b class="price">${money(l.p.precio)}</b></div>
          <div class="stepper">
            <button data-menos="${esc(l.p.id)}" aria-label="Quitar uno">${ICON_MINUS}</button>
            <b>${l.cantidad}</b>
            <button data-mas="${esc(l.p.id)}" aria-label="Agregar uno">${ICON_PLUS}</button>
          </div>
        </li>`,
        )
        .join('')}</ul>
      <dl class="tot"><div class="grand"><dt>Total</dt><dd>${money(total)}</dd></div></dl>
      <p class="muted small">Envía tu pedido por WhatsApp y te confirmamos disponibilidad y entrega.</p>
    </div>
    <div class="sheet-foot envio">
      <div class="lbl">Enviar pedido a</div>
      <div class="envio-btns">${VENDEDORES.map(
        (v) => `<a class="btn primary" href="${waLink(v.whatsapp, textoPedido(v))}" target="_blank" rel="noopener">${ICON_WA} ${esc(v.nombre)}</a>`,
      ).join('')}</div>
    </div>`,
    'cobro',
  );
}

/* ---------- Eventos ---------- */

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = 'toast'), 1800);
}

document.addEventListener('click', (e) => {
  const t = e.target;
  const el = (sel) => t.closest(sel);
  if (el('[data-add]')) {
    const id = el('[data-add]').dataset.add;
    cambiar(id, 1);
    toast(`${porId(id).nombre} agregado ✓`);
  } else if (el('[data-add-cerrar]')) {
    cambiar(el('[data-add-cerrar]').dataset.addCerrar, 1);
    cerrar();
    toast('Agregado a tu pedido ✓');
  } else if (el('[data-ver]')) modalProducto(el('[data-ver]').dataset.ver);
  else if (el('[data-pedido]')) modalPedido();
  else if (el('[data-mas]')) cambiar(el('[data-mas]').dataset.mas, 1), modalPedido();
  else if (el('[data-menos]')) cambiar(el('[data-menos]').dataset.menos, -1), modalPedido();
  else if (el('[data-cerrar]') || (t.matches('[data-fondo]'))) cerrar();
  else if (el('[data-filtro]')) {
    state.filtro = el('[data-filtro]').dataset.filtro;
    document.querySelectorAll('[data-filtro]').forEach((b) => b.classList.toggle('on', b.dataset.filtro === state.filtro));
    renderGrid();
  } else if (el('[data-genero]')) {
    state.genero = el('[data-genero]').dataset.genero;
    document.querySelectorAll('[data-genero]').forEach((b) => b.classList.toggle('on', b.dataset.genero === state.genero));
    renderGrid();
  }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'q') {
    state.q = e.target.value;
    renderGrid();
  }
});

document.addEventListener('keydown', (e) => e.key === 'Escape' && cerrar());

/* ---------- Arranque ---------- */

async function actualizarDesdeHoja() {
  if (!apiUrl) return;
  try {
    const data = await (await fetch(`${apiUrl}?t=${Date.now()}`)).json();
    if (data.ok && data.productos.length) {
      state.productos = data.productos;
      guardar(CACHE, data.productos);
      renderGrid();
      renderBarra();
    }
  } catch {
    /* sin conexión con la hoja: se muestra el último catálogo conocido */
  }
}

montar();
renderGrid();
renderBarra();
actualizarDesdeHoja();
