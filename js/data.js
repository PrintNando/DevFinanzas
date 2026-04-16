/* =============================================
   MisFinanzas — Datos y constantes (data.js)
   ============================================= */

// ---- Categorías ----
const CATS_EXPENSE = [
  { n: '🍽️ Comida',        c: '#E24B4A' },
  { n: '🚗 Transporte',    c: '#D97706' },
  { n: '🏠 Vivienda',      c: '#7F77DD' },
  { n: '💊 Salud',         c: '#16A34A' },
  { n: '📱 Tecnología',    c: '#378ADD' },
  { n: '🎬 Entretenimiento', c: '#D4537E' },
  { n: '👕 Ropa',          c: '#0F6E56' },
  { n: '📚 Educación',     c: '#B45309' },
  { n: '💡 Servicios',     c: '#64748B' },
  { n: '🛒 Mercado',       c: '#9333EA' },
  { n: '💪 Deporte',       c: '#0891B2' },
  { n: '✈️ Viajes',        c: '#EA580C' },
  { n: '🐾 Mascotas',      c: '#65A30D' },
  { n: 'Otro',             c: '#888888' },
];

const CATS_INCOME = [
  { n: '💼 Sueldo',        c: '#16A34A' },
  { n: '💻 Freelance',     c: '#378ADD' },
  { n: '🏦 Inversiones',   c: '#7F77DD' },
  { n: '🎁 Regalo',        c: '#D4537E' },
  { n: '🔄 Reembolso',     c: '#D97706' },
  { n: '🏢 Negocio',       c: '#0891B2' },
  { n: 'Otro',             c: '#888888' },
];

// ---- Estado de la app ----
const state = {
  transactions: [],
  budgets:      [],
  goals:        [],
  debts:        [],
  settings: {
    name:     '',
    currency: 'S/',
  },
  // estado temporal de modales
  txType:       'expense',
  debtType:     'owe',
  selectedCat:  null,
  pendingGoalId: null,
};

// ---- Persistencia (localStorage) ----
function loadData() {
  try {
    const raw = localStorage.getItem('misfinanzas_v1');
    if (raw) {
      const saved = JSON.parse(raw);
      state.transactions = saved.transactions || [];
      state.budgets      = saved.budgets      || [];
      state.goals        = saved.goals        || [];
      state.debts        = saved.debts        || [];
      if (saved.settings) Object.assign(state.settings, saved.settings);
    }
  } catch (e) {
    console.warn('No se pudieron cargar los datos:', e);
  }
}

function saveData() {
  try {
    const payload = {
      transactions: state.transactions,
      budgets:      state.budgets,
      goals:        state.goals,
      debts:        state.debts,
      settings:     state.settings,
    };
    localStorage.setItem('misfinanzas_v1', JSON.stringify(payload));
  } catch (e) {
    console.warn('No se pudieron guardar los datos:', e);
  }
}

function clearAllData() {
  if (!confirm('¿Seguro que quieres borrar TODOS los datos? Esta acción no se puede deshacer.')) return;
  localStorage.removeItem('misfinanzas_v1');
  state.transactions = [];
  state.budgets = [];
  state.goals = [];
  state.debts = [];
  state.settings = { name: '', currency: 'S/' };
  saveData();
  closeModal('modal-settings');
  renderHome();
  renderTx();
  renderBudget();
  renderGoals();
  renderDebts();
  updateHeader();
  alert('Todos los datos han sido eliminados.');
}

// ---- Utilidades de formato ----
function getCurrency() {
  return state.settings.currency || 'S/';
}

function fmt(n) {
  const num = parseFloat(n || 0);
  const formatted = num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return getCurrency() + ' ' + formatted;
}

function fmtShort(n) {
  const num = parseFloat(n || 0);
  if (num >= 1000000) return getCurrency() + ' ' + (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000)    return getCurrency() + ' ' + (num / 1000).toFixed(1) + 'k';
  return getCurrency() + ' ' + num.toFixed(0);
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

function formatDateFull(d) {
  if (!d) return '';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ---- Obtener transacciones del mes actual ----
function getMonthTx(month, year) {
  const now = new Date();
  const m = month !== undefined ? month : now.getMonth();
  const y = year  !== undefined ? year  : now.getFullYear();
  return state.transactions.filter(t => {
    const d = new Date(t.date + 'T12:00:00');
    return d.getMonth() === m && d.getFullYear() === y;
  });
}

// Carga inicial de datos
loadData();

//--- Limpiar pagados----
function clearPaidDebts() {
  const confirmDelete = confirm("¿Eliminar deudas saldadas?");
  if (!confirmDelete) return;

  state.debts = state.debts.filter(d => !d.paid);
  saveData();
  renderDebts();

  showFeedback('🗑️ Historial limpiado');
}