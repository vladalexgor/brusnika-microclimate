/* Брусника · Микроклимат и ОПЕКС · app.js */
(function () {
  'use strict';

  const MO = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
  const CO2_CLIP = 3300;

  /* ── Palette ──────────────────────────────────────────────────── */
  const C = {
    comfort: '#5B9BD4',
    base:    '#C06060',
    heater:  '#93B8E8',
    ac:      '#5B9BD4',
    rad:     '#6EE7B7',
    vent:    '#A78BFA',
    txt:     'rgba(238,240,245,0.55)',
    grid:    'rgba(238,240,245,0.05)',
    tooltip: { bg:'#1E2840', title:'#EEF0F5', body:'rgba(238,240,245,0.7)', border:'rgba(238,240,245,0.1)' },
  };

  /* ── Chart defaults ───────────────────────────────────────────── */
  Chart.defaults.font.family = 'Inter, Segoe UI, system-ui, sans-serif';
  Chart.defaults.font.size   = 11;
  Chart.defaults.color       = C.txt;
  Chart.defaults.plugins.legend.display = false;
  const TT = Chart.defaults.plugins.tooltip;
  TT.backgroundColor = C.tooltip.bg;
  TT.titleColor      = C.tooltip.title;
  TT.bodyColor       = C.tooltip.body;
  TT.borderColor     = C.tooltip.border;
  TT.borderWidth     = 1;
  TT.padding         = 10;
  TT.cornerRadius    = 8;

  /* ── State ────────────────────────────────────────────────────── */
  let apt    = '1c';         // '1c' | '2c'
  let metric = 'co2';       // 'co2' | 'temp' | 'rh' | 'vent'
  let room   = 'Bedroom';

  /* ── Charts registry ──────────────────────────────────────────── */
  let charts = {};

  function destroyChart(id) {
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  }

  /* ── Helpers ──────────────────────────────────────────────────── */
  const fr  = v => Math.round(v).toLocaleString('ru-RU');
  const f1  = v => parseFloat(v).toFixed(1);

  function sw(col, w = 12, h = 12) {
    return `<span style="width:${w}px;height:${h}px;border-radius:3px;background:${col};display:inline-block;flex-shrink:0"></span>`;
  }

  /* ── Apt data accessor ─────────────────────────────────────────── */
  function aptData() {
    return apt === '1c' ? DATA.apt_1c : DATA.apt_2c;
  }

  function aptRooms() {
    return apt === '1c'
      ? [{ key: 'Bedroom', label: 'Спальня' }, { key: 'Living_Room', label: 'Кухня-гостиная' }]
      : [{ key: 'Bedroom', label: 'Спальня' }, { key: 'Kids_Room', label: 'Детская' }, { key: 'Living_Room', label: 'Кухня-гостиная' }];
  }

  function ventNorm() {
    if (apt === '2c') return { Bedroom: 60, Kids_Room: 60, Living_Room: 50 }[room] || 60;
    return room === 'Bedroom' ? 120 : null;
  }

  /* ═══════════════════════════════════════════════════════════════
     HERO + KPI
  ═══════════════════════════════════════════════════════════════ */
  function renderHero() {
    const label = apt === '1c' ? '1-комн' : '2-комн';
    const num   = apt === '1c' ? '1С' : '2С';
    document.getElementById('hero-apt-label').textContent = `Квартира ${label}`;
    document.getElementById('hero-apt-num').textContent   = num;
  }

  function renderKPI() {
    const d = aptData();
    const c = d.totals.comfort;
    const b = d.totals.base;
    const diff = c - b;
    const pct  = Math.round((diff / b) * 100);

    document.getElementById('kpi-comfort').innerHTML =
      `<div class="kpi__label">ОПЕКС · Комфорт</div>
       <div class="kpi__value">${fr(c)}<small>₽/год</small></div>
       <div class="kpi__sub">${fr(Math.round(c / 12))} ₽ / месяц</div>`;

    document.getElementById('kpi-base').innerHTML =
      `<div class="kpi__label">ОПЕКС · База</div>
       <div class="kpi__value">${fr(b)}<small>₽/год</small></div>
       <div class="kpi__sub">${fr(Math.round(b / 12))} ₽ / месяц</div>`;

    document.getElementById('kpi-diff').innerHTML =
      `<div class="kpi__label">Разница</div>
       <div class="kpi__value kpi__delta--neg">+${fr(diff)}<small>₽/год</small></div>
       <div class="kpi__sub">+${fr(Math.round(diff / 12))} ₽/мес · +${pct}%</div>`;
  }

  /* ═══════════════════════════════════════════════════════════════
     OPEX — Monthly chart
  ═══════════════════════════════════════════════════════════════ */
  function renderOpexMonthly() {
    destroyChart('opex-monthly');
    const d = aptData();
    const c = d.opex.comfort;
    const b = d.opex.base;

    // Legend
    document.getElementById('opex-legend').innerHTML = [
      [C.heater, 'Калорифер П1'],
      [C.ac,     'Кондиционирование'],
      [C.rad,    'Радиаторы'],
      [C.vent,   'Вент. П1'],
    ].map(([col, lbl]) =>
      `<span class="legend-item">${sw(col)}${lbl}</span>`
    ).join('') + `<span class="legend-note" style="margin-left:auto">Комфорт (лев) / База (пр)</span>`;

    const datasets = [
      { label: 'Калорифер П1', data: c.kalori, stack: 'К', backgroundColor: C.heater + 'CC' },
      { label: 'Кондиц.К',    data: c.kond,   stack: 'К', backgroundColor: C.ac + 'CC' },
      { label: 'Радиаторы К', data: c.rad,    stack: 'К', backgroundColor: C.rad + 'CC' },
      { label: 'Вент. П1',    data: c.vent,   stack: 'К', backgroundColor: C.vent + 'CC' },
      { label: 'Кондиц.Б',   data: b.kond,   stack: 'Б', backgroundColor: C.ac + '66' },
      { label: 'Радиаторы Б',data: b.rad,    stack: 'Б', backgroundColor: C.rad + '66' },
    ].map(ds => ({ ...ds, borderWidth: 0, borderRadius: 2 }));

    charts['opex-monthly'] = new Chart(document.getElementById('chart-opex-monthly'), {
      type: 'bar',
      data: { labels: MO, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: { stacked: true, grid: { color: C.grid }, ticks: { color: C.txt, autoSkip: false, maxRotation: 0 } },
          y: { stacked: true, grid: { color: C.grid }, beginAtZero: true,
               ticks: { color: C.txt, callback: v => v >= 1000 ? Math.round(v / 1000) + 'к' : v } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            callbacks: {
              title: ctx => {
                const i = ctx[0].dataIndex;
                const tC = (c.kalori[i] || 0) + (c.kond[i] || 0) + (c.rad[i] || 0) + (c.vent[i] || 0);
                const tB = (b.kond[i] || 0) + (b.rad[i] || 0);
                return `${MO[i]}  ·  К: ${fr(tC)} ₽  |  Б: ${fr(tB)} ₽`;
              },
              label: ctx => {
                if (!ctx.parsed.y || ctx.parsed.y === 0) return null;
                const stk = ctx.dataset.stack === 'К' ? 'К' : 'Б';
                let name = ctx.dataset.label.replace(/[КБ]$/, '').replace(/\.$/, '').trim();
                if (name === 'Кондиц') name = 'Кондиционирование';
                return ` ${stk}: ${name} — ${fr(ctx.parsed.y)} ₽`;
              },
            },
          },
        },
      },
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     OPEX — Breakdown chart
  ═══════════════════════════════════════════════════════════════ */
  function renderOpexBreakdown() {
    destroyChart('opex-breakdown');
    const d = aptData();
    const c = d.opex.comfort;
    const b = d.opex.base;

    const ANC = { kalori: c.kalori.reduce((s, v) => s + v, 0), kond: c.kond.reduce((s, v) => s + v, 0), rad: c.rad.reduce((s, v) => s + v, 0), vent: c.vent.reduce((s, v) => s + v, 0) };
    const ANB = { kond: b.kond.reduce((s, v) => s + v, 0), rad: b.rad.reduce((s, v) => s + v, 0) };

    // Annual breakdown cards
    document.getElementById('opex-annual').innerHTML = [
      { label: 'Калорифер П1', c: ANC.kalori, b: null,    col: C.heater },
      { label: 'Кондиционирование', c: ANC.kond, b: ANB.kond, col: C.ac },
      { label: 'Радиаторы',   c: ANC.rad,   b: ANB.rad,  col: C.rad },
      { label: 'Вент. П1',    c: ANC.vent,  b: null,     col: C.vent },
    ].map(item => `
      <div class="annual-item">
        <div class="annual-item__label" style="display:flex;align-items:center;gap:5px">${sw(item.col, 8, 8)} ${item.label}</div>
        <div class="annual-item__c">${fr(item.c)} ₽</div>
        ${item.b !== null ? `<div class="annual-item__b">База: ${fr(item.b)} ₽</div>` : `<div class="annual-item__b">только Комфорт</div>`}
      </div>
    `).join('');

    // Horizontal bar
    const CONS = [
      { label: 'Калорифер П1',    c: ANC.kalori, b: 0,       col: C.heater },
      { label: 'Кондиционирование', c: ANC.kond, b: ANB.kond, col: C.ac },
      { label: 'Радиаторы',       c: ANC.rad,   b: ANB.rad,  col: C.rad },
      { label: 'Вент. П1',        c: ANC.vent,  b: 0,        col: C.vent },
    ];

    document.getElementById('breakdown-legend').innerHTML = CONS.map(c_ =>
      `<span class="legend-item">${sw(c_.col)}${c_.label}</span>`
    ).join('');

    charts['opex-breakdown'] = new Chart(document.getElementById('chart-breakdown'), {
      type: 'bar',
      data: {
        labels: ['Комфорт', 'База'],
        datasets: CONS.map(c_ => ({
          label: c_.label,
          data: [c_.c, c_.b],
          backgroundColor: c_.col,
          stack: 'a',
          borderRadius: 3,
          borderWidth: 0,
        })),
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        scales: {
          x: { stacked: true, grid: { color: C.grid }, ticks: { color: C.txt, callback: v => v >= 1000 ? Math.round(v / 1000) + 'к' : v } },
          y: { stacked: true, grid: { display: false }, ticks: { color: C.txt, font: { size: 12 } } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            filter: i => i.parsed.x > 0,
            callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fr(ctx.parsed.x)} ₽` },
          },
        },
      },
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     MICROCLIMATE CHART
  ═══════════════════════════════════════════════════════════════ */
  function makeBandPlugin(bands, lines) {
    return {
      id: 'bands',
      beforeDatasetsDraw(chart) {
        const { ctx, chartArea, scales: { y } } = chart;
        ctx.save();
        (bands || []).forEach(({ y1, y2, f }) => {
          const top = y.getPixelForValue(Math.min(y2, y.max));
          const bot = y.getPixelForValue(Math.max(y1, y.min));
          if (bot > top) { ctx.fillStyle = f; ctx.fillRect(chartArea.left, top, chartArea.width, bot - top); }
        });
        (lines || []).forEach(({ val, dash, col, lw }) => {
          if (val < y.min || val > y.max) return;
          const py = y.getPixelForValue(val);
          ctx.setLineDash(dash || [3, 3]);
          ctx.strokeStyle = col || 'rgba(238,240,245,0.15)';
          ctx.lineWidth   = lw || 0.7;
          ctx.beginPath(); ctx.moveTo(chartArea.left, py); ctx.lineTo(chartArea.right, py); ctx.stroke();
        });
        ctx.setLineDash([]); ctx.restore();
      },
    };
  }

  function makeOutlierPlugin(getBData) {
    return {
      id: 'outliers',
      afterDatasetsDraw(chart) {
        const orig = getBData(); if (!orig) return;
        const { ctx } = chart;
        const meta    = chart.getDatasetMeta(1);
        ctx.save();
        orig.forEach((v, i) => {
          if (v <= CO2_CLIP) return;
          const pt = meta.data[i]; if (!pt) return;
          ctx.fillStyle = C.base;
          ctx.beginPath(); ctx.moveTo(pt.x, pt.y + 2); ctx.lineTo(pt.x - 6, pt.y + 12); ctx.lineTo(pt.x + 6, pt.y + 12); ctx.closePath(); ctx.fill();
          ctx.font = '500 9px Inter,system-ui,sans-serif';
          ctx.textAlign = 'center'; ctx.fillStyle = C.base;
          ctx.fillText(v.toLocaleString('ru-RU') + ' ppm', pt.x, pt.y - 4);
        });
        ctx.restore();
      },
    };
  }

  function buildMicChart() {
    destroyChart('mic');
    const d  = aptData();
    const dc = d.mic.comfort[room];
    const db = d.mic.base[room];
    if (!dc || !db) return;

    let cData, bData, yMin, yMax, stepSize, sfx, bands, lines, plugins, ttC, ttB;

    if (metric === 'co2') {
      cData = dc.co2_max.map(v => Math.min(v, CO2_CLIP));
      bData = db.co2_max.map(v => Math.min(v, CO2_CLIP));
      yMin = 400; yMax = CO2_CLIP; stepSize = 400; sfx = ' ppm';
      bands = [
        { y1: 400,  y2: 800,      f: 'rgba(91,160,80,0.10)'  },
        { y1: 800,  y2: 1000,     f: 'rgba(192,144,64,0.12)' },
        { y1: 1000, y2: 1400,     f: 'rgba(192,96,80,0.10)'  },
        { y1: 1400, y2: CO2_CLIP, f: 'rgba(192,96,80,0.07)'  },
      ];
      lines  = [{ val: 800 }, { val: 1000 }, { val: 1400 }];
      ttC    = (_, i) => ` Комфорт: ${dc.co2_max[i].toLocaleString('ru-RU')} ppm`;
      ttB    = (_, i) => ` База: ${db.co2_max[i].toLocaleString('ru-RU')} ppm`;
      plugins = [makeBandPlugin(bands, lines), makeOutlierPlugin(() => db.co2_max)];

    } else if (metric === 'temp') {
      cData = dc.temp_mean; bData = db.temp_mean;
      yMin = 17; yMax = 26; stepSize = 2; sfx = '°C';
      bands  = [{ y1: 20, y2: 22, f: 'rgba(91,160,80,0.09)' }];
      lines  = [
        { val: 20, dash: [4, 2], col: 'rgba(91,160,80,0.40)', lw: 0.8 },
        { val: 22, dash: [4, 2], col: 'rgba(91,160,80,0.40)', lw: 0.8 },
      ];
      ttC    = (_, i) => ` Комфорт: ${cData[i]}°C`;
      ttB    = (_, i) => ` База: ${bData[i]}°C`;
      plugins = [makeBandPlugin(bands, lines)];

    } else if (metric === 'rh') {
      cData = dc.rh_max; bData = db.rh_max;
      yMin = 0; yMax = 100; stepSize = 20; sfx = '%';
      bands = [
        { y1: 0,  y2: 30,  f: 'rgba(192,144,64,0.08)' },
        { y1: 30, y2: 60,  f: 'rgba(91,160,80,0.08)'  },
        { y1: 60, y2: 100, f: 'rgba(91,155,212,0.08)' },
      ];
      lines = [
        { val: 30, dash: [4, 2], col: 'rgba(192,144,64,0.45)', lw: 0.8 },
        { val: 60, dash: [4, 2], col: 'rgba(91,155,212,0.45)', lw: 0.8 },
      ];
      ttC    = (_, i) => ` Комфорт: ${cData[i]}%`;
      ttB    = (_, i) => ` База: ${bData[i]}%`;
      plugins = [makeBandPlugin(bands, lines)];

    } else { // vent
      cData = dc.vent_mean; bData = db.vent_mean;
      const norm = ventNorm();
      yMin = 0; yMax = apt === '1c' ? 160 : 75; stepSize = apt === '1c' ? 20 : 15; sfx = ' м³/ч';
      lines  = norm ? [{ val: norm, dash: [5, 3], col: 'rgba(91,155,212,0.6)', lw: 1.2 }] : [];
      bands  = [];
      ttC    = (_, i) => ` Комфорт: ${Math.round(cData[i])} м³/ч`;
      ttB    = (_, i) => ` База: ${Math.round(bData[i])} м³/ч`;
      plugins = [makeBandPlugin(bands, lines)];
    }

    charts['mic'] = new Chart(document.getElementById('chart-mic'), {
      type: 'line',
      plugins,
      data: {
        labels: MO,
        datasets: [
          { label: 'Комфорт', data: cData, borderColor: C.comfort, borderWidth: 2,   tension: 0.35, pointRadius: 3.5, pointBackgroundColor: C.comfort, fill: false, order: 1 },
          { label: 'База',    data: bData, borderColor: C.base,    borderWidth: 2.5, tension: 0.35, pointRadius: 4,   pointBackgroundColor: C.base,    fill: false, order: 2 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: { grid: { color: C.grid }, ticks: { color: C.txt, autoSkip: false, maxRotation: 0 } },
          y: { min: yMin, max: yMax, grid: { color: C.grid }, ticks: { color: C.txt, stepSize, callback: v => Math.round(v) + sfx } },
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx2 => ctx2.datasetIndex === 0 ? ttC(null, ctx2.dataIndex) : ttB(null, ctx2.dataIndex) } },
        },
      },
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     MICROCLIMATE STATS PANEL
  ═══════════════════════════════════════════════════════════════ */
  function statRow(label, cVal, bVal, sfx, lowIsGood) {
    const cBetter = lowIsGood ? cVal <= bVal : cVal >= bVal;
    return `
      <div class="stat-item">
        <div class="stat-item__label">${label}</div>
        <div class="stat-item__grid">
          <div class="stat-cell ${cBetter ? 'stat-cell--success' : 'stat-cell--warn'}">
            <div class="stat-cell__name">Комфорт</div>
            <div class="stat-cell__val">${fr(cVal)}${sfx}</div>
          </div>
          <div class="stat-cell ${!cBetter ? 'stat-cell--success' : 'stat-cell--danger'}">
            <div class="stat-cell__name">База</div>
            <div class="stat-cell__val">${fr(bVal)}${sfx}</div>
          </div>
        </div>
      </div>`;
  }

  function statRowN(label, cVal, bVal, sfx) {
    return `
      <div class="stat-item">
        <div class="stat-item__label">${label}</div>
        <div class="stat-item__grid">
          <div class="stat-cell stat-cell--neutral">
            <div class="stat-cell__name">Комфорт</div>
            <div class="stat-cell__val">${cVal}${sfx}</div>
          </div>
          <div class="stat-cell stat-cell--neutral">
            <div class="stat-cell__name">База</div>
            <div class="stat-cell__val">${bVal}${sfx}</div>
          </div>
        </div>
      </div>`;
  }

  function updateMicStats() {
    const d  = aptData();
    const dc = d.mic.comfort[room];
    const db = d.mic.base[room];
    const el = document.getElementById('mic-stats');
    if (!dc || !db) { el.innerHTML = ''; return; }

    if (metric === 'co2') {
      el.innerHTML =
        statRow('Макс. CO₂', dc.co2_ann.max, db.co2_ann.max, ' ppm', true) +
        statRow('Среднее CO₂', Math.round(dc.co2_ann.mean), Math.round(db.co2_ann.mean), ' ppm', true) +
        statRow('Ч/год > 1000 ppm', dc.h1000, db.h1000, ' ч', true) +
        statRow('Ч/год ≥ 1400 ppm', dc.h1400, db.h1400, ' ч', true);

    } else if (metric === 'temp') {
      el.innerHTML =
        statRowN('Мин. T воздуха', f1(dc.temp_ann.min), f1(db.temp_ann.min), '°C') +
        statRowN('Сред. T воздуха', f1(dc.temp_ann.mean), f1(db.temp_ann.mean), '°C') +
        statRowN('Макс. T воздуха', f1(dc.temp_ann.max), f1(db.temp_ann.max), '°C') +
        `<div class="stat-note">Зелёная полоса — оптимум 20–22°C<br>(ГОСТ 30494-2011, хол. период)</div>`;

    } else if (metric === 'rh') {
      el.innerHTML =
        statRowN('Мин. ОВ (год)', f1(dc.rh_ann.min), f1(db.rh_ann.min), '%') +
        statRowN('Сред. ОВ (год)', f1(dc.rh_ann.mean), f1(db.rh_ann.mean), '%') +
        statRowN('Макс. ОВ (год)', f1(dc.rh_ann.max), f1(db.rh_ann.max), '%') +
        `<div class="stat-note">Оптим. 30–60%<br>Допуст. 25–65%<br>(ГОСТ 30494-2011)</div>`;

    } else { // vent
      const norm     = ventNorm();
      const isExhaust = !norm && room === 'Living_Room' && apt === '1c';
      if (isExhaust) {
        el.innerHTML =
          statRowN('Сред. подача', fr(dc.vent_ann.mean), fr(db.vent_ann.mean), ' м³/ч') +
          `<div class="stat-note">Кухня-гостиная — зона вытяжки.<br>Прямая мех. подача отсутствует<br>в обоих вариантах.</div>`;
      } else {
        el.innerHTML =
          statRow('Сред. подача', Math.round(dc.vent_ann.mean), Math.round(db.vent_ann.mean), ' м³/ч', false) +
          statRow(`Ч/год < ${norm} м³/ч`, dc.vent_h_below, db.vent_h_below, ' ч', true) +
          `<div class="stat-note">Синяя линия — норматив<br>${norm} м³/ч (вариант Комфорт)</div>`;
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     MICROCLIMATE UI
  ═══════════════════════════════════════════════════════════════ */
  const SUBTITLES = {
    co2:  'CO₂ · максимум по месяцам',
    temp: 'Температура воздуха · среднее по месяцам',
    rh:   'Относительная влажность · максимум по месяцам',
    vent: 'Подача свежего воздуха · среднее по месяцам',
  };
  const NORMS = {
    co2: 'ГОСТ 30494-2011', temp: 'ГОСТ 30494-2011',
    rh:  'ГОСТ 30494-2011', vent: 'СП 54.13330.2022',
  };

  function renderRoomTabs() {
    const rooms = aptRooms();
    // Ensure current room is valid
    if (!rooms.find(r => r.key === room)) room = rooms[0].key;

    document.getElementById('room-tabs').innerHTML = rooms.map(r =>
      `<button class="room-btn ${r.key === room ? 'room-btn--active' : ''}" data-room="${r.key}">${r.label}</button>`
    ).join('');

    document.querySelectorAll('.room-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        room = btn.dataset.room;
        document.querySelectorAll('.room-btn').forEach(b => b.classList.toggle('room-btn--active', b.dataset.room === room));
        refreshMic();
      })
    );
  }

  function updateMetricBtns() {
    document.querySelectorAll('.metric-btn').forEach(b =>
      b.classList.toggle('metric-btn--active', b.dataset.metric === metric)
    );
    document.getElementById('co2-legend').style.display = metric === 'co2' ? 'flex' : 'none';
  }

  function updateMicHeader() {
    document.getElementById('mic-subtitle').textContent = SUBTITLES[metric];
    document.getElementById('mic-norm').textContent     = NORMS[metric];
  }

  function refreshMic() {
    updateMicHeader();
    updateMetricBtns();
    buildMicChart();
    updateMicStats();
    // Legend lines
    document.getElementById('leg-comfort').style.background = C.comfort;
    document.getElementById('leg-base').style.background    = C.base;
  }

  /* ═══════════════════════════════════════════════════════════════
     FULL RENDER
  ═══════════════════════════════════════════════════════════════ */
  function renderAll() {
    renderHero();
    renderKPI();
    renderOpexMonthly();
    renderOpexBreakdown();
    renderRoomTabs();
    refreshMic();
  }

  /* ═══════════════════════════════════════════════════════════════
     EVENT LISTENERS
  ═══════════════════════════════════════════════════════════════ */
  function bindEvents() {
    // Apt toggle
    document.querySelectorAll('.apt-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        apt  = btn.dataset.apt;
        room = 'Bedroom'; // reset room on apt switch
        document.querySelectorAll('.apt-btn').forEach(b => b.classList.toggle('apt-btn--active', b.dataset.apt === apt));
        renderAll();
      })
    );

    // Metric buttons
    document.querySelectorAll('.metric-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        metric = btn.dataset.metric;
        refreshMic();
      })
    );
  }

  /* ── Init ──────────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    renderAll();
  });

})();
