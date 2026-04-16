/* =============================================
   MisFinanzas — Funciones de renderizado (render.js)
   ============================================= */

// ---- HEADER ----
function updateHeader() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
  document.getElementById('header-date').textContent = dateStr;

  const name = state.settings.name;
  const title = document.querySelector('.header h1');
  if (title) title.textContent = '💰 ' + (name ? 'Hola, ' + name : 'MisFinanzas');
}

// ---- DASHBOARD / HOME ----
function renderHome() {
  const allTx   = getMonthTx();
  const income  = allTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = allTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance  = state.transactions.reduce((s, t) => t.type === 'income' ? s + t.amount : s - t.amount, 0);

  document.getElementById('total-balance').textContent  = fmt(balance);
  document.getElementById('stat-income').textContent    = fmtShort(income);
  document.getElementById('stat-expenses').textContent  = fmtShort(expenses);

  const diff = income - expenses;
  const diffColor = diff >= 0 ? 'var(--c-success)' : 'var(--c-danger)';
  const sign = diff >= 0 ? '+' : '';
  document.getElementById('balance-sub').innerHTML =
    `Este mes: <strong style="color:${diffColor}">${sign}${fmt(diff)}</strong>`;

  renderDonut(allTx);
  renderRecentTx();
  renderHomeBudgets(allTx);
}

// ---- GRÁFICA DE DONA ----
function renderDonut(txList) {
  const canvas = document.getElementById('donut-chart');
  const ctx = canvas.getContext('2d');
  const legendEl = document.getElementById('donut-legend');

  const expenses = txList.filter(t => t.type === 'expense');
  const catMap = {};
  expenses.forEach(t => {
    if (!catMap[t.category]) catMap[t.category] = { total: 0, color: t.color };
    catMap[t.category].total += t.amount;
  });

  const cats = Object.entries(catMap)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 6);

  const total = cats.reduce((s, [, v]) => s + v.total, 0);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!total) {
    ctx.strokeStyle = 'var(--c-border)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(55, 55, 36, 0, Math.PI * 2);
    ctx.stroke();
    legendEl.innerHTML = '<div class="empty-legend">Sin gastos este mes</div>';
    return;
  }

  // Dibujar dona
  let start = -0.5 * Math.PI;
  const gap = 0.03;
  cats.forEach(([, { total: v, color }]) => {
    const slice = (v / total) * Math.PI * 2 - gap;
    ctx.beginPath();
    ctx.arc(55, 55, 38, start, start + slice);
    ctx.strokeStyle = color;
    ctx.lineWidth = 13;
    ctx.stroke();
    start += slice + gap;
  });

  // Leyenda
  legendEl.innerHTML = cats.map(([name, { total: v, color }]) => {
    const label = name.replace(/^\S+\s/, ''); // quita emoji
    const pct = Math.round(v / total * 100);
    return `<div class="legend-item">
      <div class="legend-dot" style="background:${color}"></div>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px">${label}</span>
      <span class="legend-pct">${pct}%</span>
    </div>`;
  }).join('');
}

// ---- TRANSACCIONES RECIENTES ----
function renderRecentTx() {
  const el = document.getElementById('recent-tx');
  const recent = state.transactions.slice(0, 5);
  if (!recent.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📋</div>
      <p>Sin transacciones aún</p>
      <small>Toca el botón + para agregar</small>
    </div>`;
    return;
  }
  el.innerHTML = recent.map(txHTML).join('');
}

// ---- HTML DE UNA TRANSACCIÓN ----
function txHTML(t) {
  const sign   = t.type === 'income' ? '+' : '-';
  const color  = t.type === 'income' ? 'var(--c-success)' : 'var(--c-danger)';
  const emoji  = t.category.split(' ')[0] || '💰';
  return `<div class="tx-item">
    <div class="tx-icon" style="background:${t.color}22">${emoji}</div>
    <div class="tx-info">
      <div class="tx-name">${t.desc}</div>
      <div class="tx-cat">${t.category}${t.note ? ' · ' + t.note : ''}</div>
    </div>
    <div style="text-align:right;flex-shrink:0">
      <div class="tx-amount" style="color:${color}">${sign}${fmt(t.amount)}</div>
      <div class="tx-date">${formatDate(t.date)}</div>
    </div>
  </div>`;
}

// ---- PRESUPUESTOS EN HOME ----
function renderHomeBudgets(allTx) {
  const el   = document.getElementById('home-budgets');
  const card = document.getElementById('home-budgets-card');

  if (!state.budgets.length) { card.style.display = 'none'; return; }
  card.style.display = 'block';

  el.innerHTML = state.budgets.slice(0, 3).map(b => {
    const spent = (allTx || getMonthTx())
      .filter(t => t.type === 'expense' && t.category === b.cat)
      .reduce((s, t) => s + t.amount, 0);
    const pct = Math.min(100, Math.round(spent / b.limit * 100));
    const color = pct >= 90 ? 'var(--c-danger)' : pct >= 70 ? 'var(--c-warning)' : 'var(--c-success)';
    return `<div class="progress-item">
      <div class="progress-row">
        <span>${b.cat}</span>
        <span style="color:${color};font-weight:600">${fmtShort(spent)} / ${fmtShort(b.limit)}</span>
      </div>
      <div class="bar-wrap">
        <div class="bar-fill" style="width:${pct}%;background:${color}"></div>
      </div>
    </div>`;
  }).join('');
}

// ---- LISTA DE TRANSACCIONES ----
function renderTx() {
  const search  = (document.getElementById('tx-search').value || '').toLowerCase();
  const filter  = document.getElementById('tx-filter').value;

  let txs = state.transactions.filter(t => {
    const matchSearch = t.desc.toLowerCase().includes(search) ||
                        t.category.toLowerCase().includes(search) ||
                        (t.note || '').toLowerCase().includes(search);
    const matchFilter = filter === 'all' || t.type === filter;
    return matchSearch && matchFilter;
  });

  const el = document.getElementById('tx-list');
  if (!txs.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🔍</div>
      <p>Sin resultados</p>
    </div>`;
    return;
  }
  el.innerHTML = txs.map(txHTML).join('');
}

// ---- PRESUPUESTOS ----
function renderBudget() {
  const allTx = getMonthTx();
  let totalBudget = 0, totalSpent = 0;

  state.budgets.forEach(b => {
    totalBudget += b.limit;
    totalSpent  += allTx.filter(t => t.type === 'expense' && t.category === b.cat)
                        .reduce((s, t) => s + t.amount, 0);
  });

  document.getElementById('bud-total').textContent = fmtShort(totalBudget);
  document.getElementById('bud-spent').textContent = fmtShort(totalSpent);

  const el = document.getElementById('budget-list');
  if (!state.budgets.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📊</div>
      <p>Crea tu primer presupuesto</p>
    </div>`;
    return;
  }

  el.innerHTML = state.budgets.map(b => {
    const spent = allTx.filter(t => t.type === 'expense' && t.category === b.cat)
                       .reduce((s, t) => s + t.amount, 0);
    const pct   = Math.min(100, Math.round(spent / b.limit * 100));
    const left  = b.limit - spent;
    const color = pct >= 90 ? 'var(--c-danger)' : pct >= 70 ? 'var(--c-warning)' : 'var(--c-success)';
    const pillClass = pct >= 90 ? 'pill-red' : pct >= 70 ? 'pill-warn' : 'pill-green';
    const leftHtml  = left >= 0
      ? `Quedan ${fmt(left)}`
      : `<span style="color:var(--c-danger)">Excedido ${fmt(-left)}</span>`;
    const emoji = b.cat.split(' ')[0] || '📁';

    return `<div class="budget-item">
      <div class="budget-cat-icon" style="background:${b.color}22">${emoji}</div>
      <div class="budget-info">
        <div class="budget-name">${b.cat}</div>
        <div class="bar-wrap"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="budget-detail">${fmt(spent)} de ${fmt(b.limit)} · ${leftHtml}</div>
      </div>
      <span class="pill ${pillClass}">${pct}%</span>
    </div>`;
  }).join('');
}

// ---- METAS ----
function renderGoals() {
  const el = document.getElementById('goals-list');

  if (!state.goals.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🎯</div>
      <p>Define tu primera meta financiera</p>
      <small>Ahorra con un objetivo claro en mente</small>
    </div>`;
    return;
  }

  el.innerHTML = state.goals.map(g => {
    const pct   = Math.min(100, Math.round(g.saved / g.target * 100));
    const color = pct >= 100 ? 'var(--c-success)' : pct >= 50 ? 'var(--c-primary)' : 'var(--c-warning)';
    const remaining = g.target - g.saved;
    let dateStr = '';
    if (g.date) {
      const d = new Date(g.date + 'T12:00:00');
      dateStr = `· Meta: ${d.toLocaleDateString('es-PE', { month: 'short', year: 'numeric' })}`;
    }
    const statusText = pct >= 100
      ? '✅ ¡Meta alcanzada!'
      : `Faltan ${fmt(remaining)}`;

    return `<div class="goal-card">
      <div class="goal-header">
        <div>
          <div class="goal-name">🎯 ${g.name}</div>
          <div class="goal-target">${fmt(g.saved)} ahorrados de ${fmt(g.target)} ${dateStr}</div>
        </div>
        <div class="goal-pct" style="color:${color}">${pct}%</div>
      </div>
      <div class="bar-wrap" style="height:8px">
        <div class="bar-fill" style="width:${pct}%;background:${color}"></div>
      </div>
      <div class="goal-footer">
        <span>${statusText}</span>
        <button class="btn btn-sm btn-outline" onclick="openAddToGoal(${g.id})">+ Abonar</button>
      </div>
    </div>`;
  }).join('');
}

// ---- DEUDAS ----
function renderDebts() {
  const el = document.getElementById('debts-list');

  // Calcular totales SOLO de deudas vigentes (no pagadas)
  const totalOwe  = state.debts.filter(d => d.type === 'owe' && !d.paid).reduce((s, d) => s + d.amount, 0);
  const totalLent = state.debts.filter(d => d.type === 'lent' && !d.paid).reduce((s, d) => s + d.amount, 0);

  document.getElementById('total-debts').textContent = fmt(totalOwe);
  document.getElementById('total-lent').textContent  = fmt(totalLent);

  if (!state.debts.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-icon">💳</div>
      <p>Sin deudas registradas</p>
    </div>`;
    return;
  }

  const owe  = state.debts.filter(d => d.type === 'owe');
  const lent = state.debts.filter(d => d.type === 'lent');
  const now  = new Date();
  let html   = '';

  // Sección "Yo debo"
if (owe.length) {
  html += `<div class="card">
    <div class="card-title">Yo debo</div>
    <div class="debts-container">`;  // ← Agrega clase debts-container
  html += owe.map(d => debtHTML(d, now, 'var(--c-danger)')).join('');
  html += `</div>
    </div>`;
}

// Sección "Me deben"
if (lent.length) {
  html += `<div class="card">
    <div class="card-title">Me deben</div>
    <div style="display: flex; flex-direction: column; gap: 12px;">`;  // ← Estilo inline
  html += lent.map(d => `<div style="width: 100%;">${debtHTML(d, now, 'var(--c-success)')}</div>`).join('');
  html += `</div>
    </div>`;
}

el.innerHTML = html;
}

function debtHTML(d, now, color) {
  const overdue = d.due && new Date(d.due) < now && !d.paid;

  return `
    <div class="debt-item" style="
      border-left: 4px solid ${d.paid ? '#16a34a' : color};
      background: ${d.paid ? 'rgba(22, 163, 74, 0.12)' : 'white'};
      display:flex;
      align-items:center;
      gap:10px;
      ">
      
      <input type="checkbox" 
        ${d.paid ? "checked" : ""} 
        onchange="toggleDebtPaid(${d.id})">

      <div style="flex:1; margin-left:10px;">
        <div style="
          font-weight:600;
          text-decoration:${d.paid ? "line-through" : "none"};
        ">
          ${d.person}
        </div>

        <div style="
          font-size:12px;
          opacity:0.7;
          text-decoration:${d.paid ? "line-through" : "none"};
        ">
          ${d.desc || ''}
        </div>

        ${
          d.due
            ? `<div style="font-size:11px; color:${overdue ? 'red' : '#888'}">
                ${overdue ? '⚠️ Vencido' : '📅'} ${d.due}
              </div>`
            : ''
        }
      </div>

      <div style="
        display:flex;
        flex-direction:column;
        align-items:flex-end;
        gap:4px;
        ">
        <div style="
          font-weight:bold;
          text-decoration:${d.paid ? "line-through" : "none"};
        ">
          ${fmt(d.amount)}
        </div>

        <button onclick="toggleDebtPaid(${d.id})" style="
          background:${d.paid ? '#16a34a' : '#e5e7eb'};
          color:${d.paid ? 'white' : '#333'};
          border:none;
          padding:4px 8px;
          border-radius:6px;
          cursor:pointer;
          font-size:12px;
        ">
          ${d.paid ? '✔ Pagado' : 'Marcar'}
        </button>

    </div>
  `;
}

// ---- CHIPS DE CATEGORÍAS ----
function renderCatChips() {
  const cats  = state.txType === 'expense' ? CATS_EXPENSE : CATS_INCOME;
  const wrap  = document.getElementById('cat-chips');
  wrap.innerHTML = cats.map(c => {
    const sel = state.selectedCat === c.n ? ' selected' : '';
    return `<button class="chip${sel}" onclick="selectCat('${c.n.replace(/'/g, "\\'")}')">${c.n}</button>`;
  }).join('');
}

function selectCat(name) {
  state.selectedCat = name;
  renderCatChips();
}
