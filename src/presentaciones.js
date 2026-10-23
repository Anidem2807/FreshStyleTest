// Presentaciones (tamaños) y descuento por envase rellenado.
// El precio del catálogo es el de 35 ml; cada columna de `precios` es un nivel de ese precio.
// La hoja "Presentaciones" de Google Sheets puede reemplazar esta tabla.
export const ML_BASE = 35;

export const PRESENTACIONES_BASE = {
  filas: [
    { ml: 16, relleno: 15, precios: { 160: 90, 180: 100 } },
    { ml: 25, relleno: 20, precios: { 160: 120, 180: 135 } },
    { ml: 35, relleno: 20, precios: { 160: 160, 180: 180 } },
    { ml: 60, relleno: 20, precios: { 160: 250, 180: 280 } },
  ],
};

const fila = (ml, tabla) => tabla.filas.find((f) => f.ml === ml);

export const tamanos = (tabla) => tabla.filas.map((f) => f.ml);

// Precio de un perfume en otra presentación. Si su precio de 35 ml no está en la tabla,
// se calcula en proporción al nivel más cercano, redondeado a $5.
export function precioEn(p, ml, tabla) {
  const base = Number(p.precio) || 0;
  const f = fila(ml, tabla);
  if (!f || ml === ML_BASE) return base;
  if (f.precios[base] !== undefined) return Number(f.precios[base]);
  const niveles = Object.keys(f.precios).map(Number);
  if (!niveles.length || !base) return base;
  const nivel = niveles.reduce((a, b) => (Math.abs(b - base) < Math.abs(a - base) ? b : a));
  return Math.round((base * f.precios[nivel]) / nivel / 5) * 5;
}

export const descuentoRelleno = (ml, tabla) => Number(fila(ml, tabla)?.relleno) || 0;
