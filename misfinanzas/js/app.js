/* =============================================
   MisFinanzas — Lógica principal (app.js)
   ============================================= */

// ---- NAVEGACIÓN ----
function showPage(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  if (btn) btn.classList.add('active');

  // Renderizar la página correspondiente
  switch (id) {
    case 'home':   renderHome();   break;
    case 'tx':     renderTx();     break;
    case 'budget': renderBudget(); break;
    case 'goals':  renderGoals();  break;
    case 'debts':  renderDebts();  break;
  }
}

// ---- MODALES ----
function openModal(id) {
  // Preparar datos según el modal
  if (id === 'modal-tx')       prepTxModal();
  if (id === 'modal-budget')   prepBudgetModal();
  if (id === 'modal-goal')     prepGoalModal();
  if (id === 'modal-debt')     prepDebtModal();
  if (id === 'modal-settings') prepSettingsModal();

  document.getElementById(id).classList.add('open');
  // Prevenir scroll del body mientras el modal está abierto
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

// Cerrar modal tocando el fondo
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => {
    if (e.target === m) {
      m.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
});

// ---- PREPARAR MODALES ----
function prepTxModal() {
  document.getElementById('tx-amount').value = '';
  document.getElementById('tx-desc').value   = '';
  document.getElementById('tx-note').value   = '';
  document.getElementById('tx-date').value   = new Date().toISOString().split('T')[0];
  state.txType     = 'expense';
  state.selectedCat = null;
  document.getElementById('type-expense').classList.add('active');
  document.getElementById('type-income').classList.remove('active');
  renderCatChips();
}

function prepBudgetModal() {
  const sel = document.getElementById('bud-cat');
  sel.innerHTML = '<option value="">Seleccionar categoría...</option>';
  CATS_EXPENSE.forEach(c => {
    const o = document.createElement('option');
    o.value = c.n;
    o.textContent = c.n;
    sel.appendChild(o);
  });
  document.getElementById('bud-limit').value = '';
}

function prepGoalModal() {
  ['goal-name', 'goal-target', 'goal-saved', 'goal-date'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

function prepDebtModal() {
  ['debt-person', 'debt-amount', 'debt-due', 'debt-desc'].forEach(id => {
    document.getElementById(id).value = '';
  });
  state.debtType = 'owe';
  document.getElementById('debt-type-owe').classList.add('active');
  document.getElementById('debt-type-lent').classList.remove('active');
}

function prepSettingsModal() {
  document.getElementById('cfg-name').value     = state.settings.name || '';
  document.getElementById('cfg-currency').value = state.settings.currency || 'S/';
}

// ---- TIPO DE TRANSACCIÓN ----
function setTxType(t) {
  state.txType      = t;
  state.selectedCat = null;
  document.getElementById('type-expense').classList.toggle('active', t === 'expense');
  document.getElementById('type-income').classList.toggle('active',  t === 'income');
  renderCatChips();
}

// ---- TIPO DE DEUDA ----
function setDebtType(t) {
  state.debtType = t;
  document.getElementById('debt-type-owe').classList.toggle('active',  t === 'owe');
  document.getElementById('debt-type-lent').classList.toggle('active', t === 'lent');
}



// ---- GUARDAR TRANSACCIÓN ----
function saveTransaction() {
  const amt  = parseFloat(document.getElementById('tx-amount').value);
  const desc = document.getElementById('tx-desc').value.trim();
  const date = document.getElementById('tx-date').value;
  const note = document.getElementById('tx-note').value.trim();

  if (!amt || amt <= 0)     { alert('Ingresa un monto válido.'); return; }
  if (!desc)                { alert('Ingresa una descripción.'); return; }
  if (!state.selectedCat)  { alert('Selecciona una categoría.'); return; }
  if (!date)                { alert('Selecciona una fecha.'); return; }

  const cats  = state.txType === 'expense' ? CATS_EXPENSE : CATS_INCOME;
  const catObj = cats.find(c => c.n === state.selectedCat) || { n: state.selectedCat, c: '#888' };

  state.transactions.unshift({
    id:       Date.now(),
    type:     state.txType,
    amount:   amt,
    desc,
    category: catObj.n,
    color:    catObj.c,
    date,
    note,
  });

  saveData();
  closeModal('modal-tx');


  // Refrescar vistas que pueden estar activas
  renderHome();
  renderTx();
  renderBudget();

  showFeedback('✅ Transacción guardada');
}

// ---- GUARDAR PRESUPUESTO ----
function saveBudget() {
  const cat   = document.getElementById('bud-cat').value;
  const limit = parseFloat(document.getElementById('bud-limit').value);

  if (!cat)              { alert('Selecciona una categoría.'); return; }
  if (!limit || limit <= 0) { alert('Ingresa un límite válido.'); return; }

  const catObj   = CATS_EXPENSE.find(c => c.n === cat) || { c: '#888' };
  const existing = state.budgets.findIndex(b => b.cat === cat);

  if (existing >= 0) {
    state.budgets[existing] = { ...state.budgets[existing], limit, color: catObj.c };
  } else {
    state.budgets.push({ id: Date.now(), cat, limit, color: catObj.c });
  }

  saveData();
  closeModal('modal-budget');
  renderBudget();
  renderHome();

  showFeedback('✅ Presupuesto guardado');
}

// ---- GUARDAR META ----
function saveGoal() {
  const name   = document.getElementById('goal-name').value.trim();
  const target = parseFloat(document.getElementById('goal-target').value);
  const saved  = parseFloat(document.getElementById('goal-saved').value) || 0;
  const date   = document.getElementById('goal-date').value;

  if (!name)                 { alert('Ingresa un nombre para la meta.'); return; }
  if (!target || target <= 0) { alert('Ingresa un monto objetivo válido.'); return; }
  if (saved > target)        { alert('El monto ahorrado no puede superar el objetivo.'); return; }

  state.goals.push({ id: Date.now(), name, target, saved, date });
  saveData();
  closeModal('modal-goal');
  renderGoals();

  showFeedback('✅ Meta creada');
}

// ---- ABONAR A META ----
function openAddToGoal(id) {
  state.pendingGoalId = id;
  const g = state.goals.find(g => g.id === id);
  if (!g) return;
  document.getElementById('goal-add-title').textContent = `Abonar a: ${g.name}`;
  document.getElementById('goal-add-amount').value = '';
  document.getElementById('modal-goal-add').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function confirmAddToGoal() {
  const amt = parseFloat(document.getElementById('goal-add-amount').value);
  if (!amt || amt <= 0) { alert('Ingresa un monto válido.'); return; }

  const g = state.goals.find(g => g.id === state.pendingGoalId);
  if (g) {
    g.saved = Math.min(g.target, g.saved + amt);
    saveData();
    renderGoals();
    showFeedback(`✅ ${fmt(amt)} abonados a "${g.name}"`);
  }
  closeModal('modal-goal-add');
}

// ---- GUARDAR DEUDA ----
function saveDebt() {
  const person = document.getElementById('debt-person').value.trim();
  const amount = parseFloat(document.getElementById('debt-amount').value);
  const due    = document.getElementById('debt-due').value;
  const desc   = document.getElementById('debt-desc').value.trim();

  if (!person) { alert('Ingresa la persona o entidad.'); return; }
  if (!amount || amount <= 0) { alert('Ingresa un monto válido.'); return; }

  state.debts.push({
    id: Date.now(),
    type: state.debtType,
    person,
    amount,
    due,
    desc,
    paid: false
  });

  saveData();
  closeModal('modal-debt');
  renderDebts();

  showFeedback('✅ Deuda/préstamo registrado');
}

function toggleDebtPaid(id) {
  const debt = state.debts.find(d => d.id === id);
  if (debt) {
    debt.paid = !debt.paid;
    saveData();
    renderDebts();
  }
}

function deleteDebt(id) {
  state.debts = state.debts.filter(d => d.id !== id);
  saveData();
  renderDebts();
}

  saveData();
  closeModal('modal-debt');
  renderDebts();

  showFeedback('✅ Deuda/préstamo registrado');

// ---- GUARDAR CONFIGURACIÓN ----
function saveSettings() {
  state.settings.name     = document.getElementById('cfg-name').value.trim();
  state.settings.currency = document.getElementById('cfg-currency').value;
  saveData();
  closeModal('modal-settings');
  updateHeader();
  renderHome();

  showFeedback('✅ Configuración guardada');
}

// ---- FEEDBACK TOAST ----
function showFeedback(msg) {
  // Crear o reutilizar el toast
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%) translateY(20px);
      background: #1A1A2E; color: #fff; padding: 10px 20px; border-radius: 50px;
      font-size: 14px; font-weight: 600; z-index: 200; opacity: 0;
      transition: all 0.25s ease; white-space: nowrap; max-width: 90vw;
      font-family: -apple-system, sans-serif;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  // Animar entrada
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2500);
}

// ---- EVENTOS DE BÚSQUEDA ----
document.getElementById('tx-search').addEventListener('input', () => {
  if (document.getElementById('page-tx').classList.contains('active')) renderTx();
});

document.getElementById('tx-filter').addEventListener('change', () => {
  if (document.getElementById('page-tx').classList.contains('active')) renderTx();
});

// ---- INICIALIZACIÓN ----
(function init() {
  updateHeader();
  renderHome();
  renderTx();
  renderBudget();
  renderGoals();
  renderDebts();

  // Soporte para gesto de "atrás" en mobile en modales abiertos
  window.addEventListener('popstate', () => {
    const openModal = document.querySelector('.modal-overlay.open');
    if (openModal) {
      openModal.classList.remove('open');
      document.body.style.overflow = '';
    }
  });

  console.log('%c💰 MisFinanzas cargado correctamente', 'color:#4F46E5;font-weight:bold;font-size:14px');
})();
