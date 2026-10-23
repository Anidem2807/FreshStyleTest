// Datos de contacto de FreshStyle (tomados del sitio). Edita aquí si cambian.
export const VENDEDORES = [
  { nombre: 'Eduardo', whatsapp: '523317809484' },
  { nombre: 'Aarón', whatsapp: '523327536019' },
];

export const REDES = {
  tiktok: 'https://www.tiktok.com/@fresh.style.perfumeria',
  facebook: 'https://www.facebook.com/share/17PWYbBp4i/',
  sitio: 'https://sites.google.com/view/perfumesfreshstyle/inicio',
};

export const FAMILIAS = ['Dulce', 'Fresco', 'Amaderado', 'Floral', 'Nocturno'];

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const money = (n) => fmt.format(n || 0);

export const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Acepta rutas del catálogo integrado, URLs de imagen o enlaces para compartir de Google Drive.
export const imgSrc = (p) => {
  if (!p.imagen) return 'icon-192.png';
  const drive = p.imagen.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=)([\w-]+)/);
  return drive ? `https://lh3.googleusercontent.com/d/${drive[1]}=w600` : p.imagen;
};

export const agotado = (p) => p.stock !== null && p.stock !== undefined && p.stock !== '' && p.stock <= 0;
