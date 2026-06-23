/* Брусника · Микроклимат и OPEX · app.js */
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
    capex_v: '#A78BFA',
    capex_h: '#5B9BD4',
    capex_k: '#6EE7B7',
    txt:     'rgba(238,240,245,0.52)',
    grid:    'rgba(238,240,245,0.045)',
    tt:      { bg:'#1E2840', title:'#EEF0F5', body:'rgba(238,240,245,0.68)', border:'rgba(238,240,245,0.1)' },
  };

  /* ── Chart defaults ───────────────────────────────────────────── */
  Chart.defaults.font.family = 'Inter, Segoe UI, system-ui, sans-serif';
  Chart.defaults.font.size   = 11;
  Chart.defaults.color       = C.txt;
  Chart.defaults.plugins.legend.display = false;
  const TT = Chart.defaults.plugins.tooltip;
  TT.backgroundColor = C.tt.bg; TT.titleColor = C.tt.title;
  TT.bodyColor = C.tt.body;     TT.borderColor = C.tt.border;
  TT.borderWidth = 1; TT.padding = 10; TT.cornerRadius = 8;

  /* ── State ────────────────────────────────────────────────────── */
  let apt    = '1c';
  let metric = 'co2';
  let room   = 'Bedroom';

  /* ── Charts registry ──────────────────────────────────────────── */
  const charts = {};
  function destroyChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

  /* ── Helpers ──────────────────────────────────────────────────── */
  const fr  = v => Math.round(v).toLocaleString('ru-RU');
  const f1  = v => parseFloat(v).toFixed(1);
  function sw(col, w=10, h=10) {
    return `<span style="width:${w}px;height:${h}px;border-radius:2px;background:${col};display:inline-block;flex-shrink:0"></span>`;
  }

  /* ── Data accessors ───────────────────────────────────────────── */
  const aptData  = () => apt === '1c' ? DATA.apt_1c : DATA.apt_2c;
  const aptRooms = () => apt === '1c'
    ? [{key:'Bedroom',label:'Спальня'},{key:'Living_Room',label:'Кухня-гостиная'}]
    : [{key:'Bedroom',label:'Спальня'},{key:'Kids_Room',label:'Детская'},{key:'Living_Room',label:'Кухня-гостиная'}];

  function ventNorm() {
    if (apt === '2c') return {Bedroom:60,Kids_Room:60,Living_Room:50}[room] || 60;
    return room === 'Bedroom' ? 120 : null;
  }

  /* ═══════════════════════════════════════════════════════════════
     HERO + KPI
  ═══════════════════════════════════════════════════════════════ */
  function renderHero() {
    const label = apt === '1c' ? '1-комн' : '2-комн';
    document.getElementById('hero-apt-label').textContent = `Квартира ${label}`;
    document.getElementById('hero-apt-num').textContent   = apt === '1c' ? '1С' : '2С';
  }

  function renderKPI() {
    const d   = aptData();
    const oc  = d.totals.comfort;
    const ob  = d.totals.base;
    const cc  = d.capex.comfort.total;
    const cb  = d.capex.base.total;
    const dco = oc - ob;         // ежегодная разница OPEX
    const dca = cc - cb;         // разница CAPEX (положительная = Комфорт дороже)
    const moCost = Math.round(dco / 12); // стоимость комфорта в месяц
    const t5c = d.tco.y5.comfort;
    const t5b = d.tco.y5.base;
    const dt5 = t5c - t5b;

    document.getElementById('kpi-root').innerHTML = `
      <!-- CAPEX Комфорт -->
      <div class="kpi kpi--comfort">
        <div class="kpi__label">CAPEX · Комфорт</div>
        <div class="kpi__value">${fr(cc)}<small>₽</small></div>
        <div class="kpi__sub">Оборудование · разово</div>
        <div class="kpi__delta kpi__delta--neg">↑ дороже Базы на ${fr(dca)} ₽</div>
      </div>
      <!-- CAPEX База -->
      <div class="kpi kpi--base">
        <div class="kpi__label">CAPEX · База</div>
        <div class="kpi__value">${fr(cb)}<small>₽</small></div>
        <div class="kpi__sub">Оборудование · разово</div>
        <div class="kpi__delta kpi__delta--pos">✓ экономия ${fr(dca)} ₽</div>
      </div>
      <!-- Стоимость комфорта в месяц -->
      <div class="kpi kpi--cost">
        <div class="kpi__label">Стоимость комфорта</div>
        <div class="kpi__value">${fr(moCost)}<small>₽/мес</small></div>
        <div class="kpi__sub">Разница OPEX · ${fr(Math.round(dco/365))} ₽/день</div>
        <div class="kpi__delta kpi__delta--warn">+${fr(dco)} ₽/год</div>
      </div>
      <!-- OPEX Комфорт -->
      <div class="kpi kpi--comfort">
        <div class="kpi__label">OPEX · Комфорт</div>
        <div class="kpi__value">${fr(oc)}<small>₽/год</small></div>
        <div class="kpi__sub">${fr(Math.round(oc/12))} ₽ / месяц</div>
      </div>
      <!-- TCO 5 лет -->
      <div class="kpi kpi--tco">
        <div class="kpi__label">TCO · 5 лет</div>
        <div class="kpi__value">${fr(t5c)}<small>₽</small></div>
        <div class="kpi__sub">База: ${fr(t5b)} ₽</div>
        <div class="kpi__delta ${dt5 > 0 ? 'kpi__delta--neg' : 'kpi__delta--pos'}">Δ ${dt5 > 0 ? '+' : ''}${fr(dt5)} ₽</div>
      </div>`;
  }

  /* ═══════════════════════════════════════════════════════════════
     MICROCLIMATE CHART
  ═══════════════════════════════════════════════════════════════ */
  function makeBandPlugin(bands, lines) {
    return { id: 'bands', beforeDatasetsDraw(chart) {
      const { ctx, chartArea, scales: { y } } = chart;
      ctx.save();
      (bands||[]).forEach(({y1,y2,f}) => {
        const top = y.getPixelForValue(Math.min(y2,y.max));
        const bot = y.getPixelForValue(Math.max(y1,y.min));
        if (bot > top) { ctx.fillStyle=f; ctx.fillRect(chartArea.left,top,chartArea.width,bot-top); }
      });
      (lines||[]).forEach(({val,dash,col,lw}) => {
        if (val < y.min || val > y.max) return;
        const py = y.getPixelForValue(val);
        ctx.setLineDash(dash||[3,3]);
        ctx.strokeStyle = col || 'rgba(238,240,245,0.14)';
        ctx.lineWidth   = lw  || 0.7;
        ctx.beginPath(); ctx.moveTo(chartArea.left,py); ctx.lineTo(chartArea.right,py); ctx.stroke();
      });
      ctx.setLineDash([]); ctx.restore();
    }};
  }

  function makeOutlierPlugin(getBData, clip = CO2_CLIP) {
    return { id: 'outliers', afterDatasetsDraw(chart) {
      const orig = getBData(); if (!orig) return;
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(1);
      ctx.save();
      orig.forEach((v,i) => {
        if (v <= clip) return;
        const pt = meta.data[i]; if (!pt) return;
        ctx.fillStyle = C.base;
        ctx.beginPath(); ctx.moveTo(pt.x,pt.y+2); ctx.lineTo(pt.x-6,pt.y+12); ctx.lineTo(pt.x+6,pt.y+12); ctx.closePath(); ctx.fill();
        ctx.font = '500 9px Inter,system-ui,sans-serif';
        ctx.textAlign = 'center'; ctx.fillStyle = C.base;
        ctx.fillText(v.toLocaleString('ru-RU')+' ppm', pt.x, pt.y-4);
      });
      ctx.restore();
    }};
  }

  function buildMicChart() {
    destroyChart('mic');
    const d  = aptData();
    const dc = d.mic.comfort[room];
    const db = d.mic.base[room];
    if (!dc || !db) return;

    let cData, bData, yMin, yMax, stepSize, sfx, bands, lines, plugins, ttC, ttB;

    if (metric === 'co2') {
      const rawMax  = Math.max(...dc.co2_max, ...db.co2_max);
      const co2Step = rawMax > 3200 ? 800 : 400;
      const co2Clip = Math.max(1600, Math.ceil(rawMax / co2Step) * co2Step);
      cData = dc.co2_max.map(v => Math.min(v, co2Clip));
      bData = db.co2_max.map(v => Math.min(v, co2Clip));
      yMin=400; yMax=co2Clip; stepSize=co2Step; sfx=' ppm';
      bands = [
        {y1:400, y2:800,      f:'rgba(91,160,80,0.10)'},
        {y1:800, y2:1000,     f:'rgba(192,152,72,0.11)'},
        {y1:1000,y2:1400,     f:'rgba(192,96,80,0.09)'},
        {y1:1400,y2:co2Clip,  f:'rgba(192,96,80,0.06)'},
      ];
      lines   = [{val:800},{val:1000},{val:1400}];
      ttC     = (_,i) => ` Комфорт: ${dc.co2_max[i].toLocaleString('ru-RU')} ppm`;
      ttB     = (_,i) => ` База: ${db.co2_max[i].toLocaleString('ru-RU')} ppm`;
      plugins = [makeBandPlugin(bands,lines), makeOutlierPlugin(()=>db.co2_max, co2Clip)];

    } else if (metric === 'temp') {
      cData = dc.temp_mean; bData = db.temp_mean;
      yMin=17; yMax=26; stepSize=2; sfx='°C';
      bands  = [{y1:20,y2:22,f:'rgba(91,160,80,0.09)'}];
      lines  = [
        {val:20,dash:[4,2],col:'rgba(91,160,80,0.38)',lw:0.8},
        {val:22,dash:[4,2],col:'rgba(91,160,80,0.38)',lw:0.8},
      ];
      ttC     = (_,i) => ` Комфорт: ${cData[i]}°C`;
      ttB     = (_,i) => ` База: ${bData[i]}°C`;
      plugins = [makeBandPlugin(bands,lines)];

    } else if (metric === 'rh') {
      cData = dc.rh_max; bData = db.rh_max;
      yMin=0; yMax=100; stepSize=20; sfx='%';
      bands = [
        {y1:0, y2:30, f:'rgba(192,152,72,0.08)'},
        {y1:30,y2:60, f:'rgba(91,160,80,0.08)'},
        {y1:60,y2:100,f:'rgba(91,155,212,0.08)'},
      ];
      lines = [
        {val:30,dash:[4,2],col:'rgba(192,152,72,0.42)',lw:0.8},
        {val:60,dash:[4,2],col:'rgba(91,155,212,0.42)',lw:0.8},
      ];
      ttC     = (_,i) => ` Комфорт: ${cData[i]}%`;
      ttB     = (_,i) => ` База: ${bData[i]}%`;
      plugins = [makeBandPlugin(bands,lines)];

    } else { // vent
      cData = dc.vent_mean; bData = db.vent_mean;
      const norm = ventNorm();
      yMin = 0;
      yMax = apt === '1c' ? 160 : 75;
      stepSize = apt === '1c' ? 20 : 15;
      sfx  = ' м³/ч';
      lines   = norm ? [{val:norm,dash:[5,3],col:'rgba(91,155,212,0.58)',lw:1.2}] : [];
      bands   = [];
      ttC     = (_,i) => ` Комфорт: ${Math.round(cData[i])} м³/ч`;
      ttB     = (_,i) => ` База: ${Math.round(bData[i])} м³/ч`;
      plugins = [makeBandPlugin(bands,lines)];
    }

    charts['mic'] = new Chart(document.getElementById('chart-mic'), {
      type: 'line', plugins,
      data: { labels: MO, datasets: [
        {label:'Комфорт',data:cData,borderColor:C.comfort,borderWidth:2,tension:0.35,pointRadius:3.5,pointBackgroundColor:C.comfort,fill:false,order:1},
        {label:'База',   data:bData,borderColor:C.base,   borderWidth:2.5,tension:0.35,pointRadius:4,  pointBackgroundColor:C.base,   fill:false,order:2},
      ]},
      options: {
        responsive:true, maintainAspectRatio:false,
        scales: {
          x: {grid:{color:C.grid},ticks:{color:C.txt,autoSkip:false,maxRotation:0}},
          y: {min:yMin,max:yMax,grid:{color:C.grid},ticks:{color:C.txt,stepSize,callback:v=>Math.round(v)+sfx}},
        },
        plugins: { legend:{display:false}, tooltip:{callbacks:{
          label: ctx2 => ctx2.datasetIndex===0 ? ttC(null,ctx2.dataIndex) : ttB(null,ctx2.dataIndex),
        }}},
      },
    });
  }

  /* ── Mic stats panel ─────────────────────────────────────────── */
  function statRow(label,cVal,bVal,sfx,lowIsGood) {
    const cBetter = lowIsGood ? cVal<=bVal : cVal>=bVal;
    return `<div class="stat-item">
      <div class="stat-item__label">${label}</div>
      <div class="stat-item__grid">
        <div class="stat-cell ${cBetter?'stat-cell--success':'stat-cell--warn'}">
          <div class="stat-cell__name">Комфорт</div>
          <div class="stat-cell__val">${fr(cVal)}${sfx}</div>
        </div>
        <div class="stat-cell ${!cBetter?'stat-cell--success':'stat-cell--danger'}">
          <div class="stat-cell__name">База</div>
          <div class="stat-cell__val">${fr(bVal)}${sfx}</div>
        </div>
      </div></div>`;
  }
  function statRowN(label,cVal,bVal,sfx) {
    return `<div class="stat-item">
      <div class="stat-item__label">${label}</div>
      <div class="stat-item__grid">
        <div class="stat-cell stat-cell--neutral"><div class="stat-cell__name">Комфорт</div><div class="stat-cell__val">${cVal}${sfx}</div></div>
        <div class="stat-cell stat-cell--neutral"><div class="stat-cell__name">База</div><div class="stat-cell__val">${bVal}${sfx}</div></div>
      </div></div>`;
  }

  function updateMicStats() {
    const d  = aptData();
    const dc = d.mic.comfort[room];
    const db = d.mic.base[room];
    const el = document.getElementById('mic-stats');
    if (!dc || !db) { el.innerHTML = ''; return; }

    if (metric === 'co2') {
      el.innerHTML =
        statRow('Макс. CO₂',dc.co2_ann.max,db.co2_ann.max,' ppm',true) +
        statRow('Среднее CO₂',Math.round(dc.co2_ann.mean),Math.round(db.co2_ann.mean),' ppm',true) +
        statRow('Ч/год > 1000 ppm',dc.h1000,db.h1000,' ч',true) +
        statRow('Ч/год ≥ 1400 ppm',dc.h1400,db.h1400,' ч',true);

    } else if (metric === 'temp') {
      el.innerHTML =
        statRowN('Мин. T воздуха',f1(dc.temp_ann.min),f1(db.temp_ann.min),'°C') +
        statRowN('Сред. T воздуха',f1(dc.temp_ann.mean),f1(db.temp_ann.mean),'°C') +
        statRowN('Макс. T воздуха',f1(dc.temp_ann.max),f1(db.temp_ann.max),'°C') +
        `<div class="stat-note">Зелёная полоса — оптимум 20–22°C<br>(ГОСТ 30494-2011, холодный период)</div>`;

    } else if (metric === 'rh') {
      el.innerHTML =
        statRowN('Мин. ОВ (год)',f1(dc.rh_ann.min),f1(db.rh_ann.min),'%') +
        statRowN('Сред. ОВ (год)',f1(dc.rh_ann.mean),f1(db.rh_ann.mean),'%') +
        statRowN('Макс. ОВ (год)',f1(dc.rh_ann.max),f1(db.rh_ann.max),'%') +
        `<div class="stat-note">Оптим. 30–60%<br>Допуст. 25–65%<br>(ГОСТ 30494-2011)</div>`;

    } else {
      const norm     = ventNorm();
      const isExhaust = !norm && room === 'Living_Room' && apt === '1c';
      if (isExhaust) {
        el.innerHTML =
          statRowN('Сред. подача',fr(dc.vent_ann.mean),fr(db.vent_ann.mean),' м³/ч') +
          `<div class="stat-note">Кухня-гостиная — зона вытяжки.<br>Прямая мех. подача отсутствует в обоих вариантах.</div>`;
      } else {
        el.innerHTML =
          statRow('Сред. подача',Math.round(dc.vent_ann.mean),Math.round(db.vent_ann.mean),' м³/ч',false) +
          statRow(`Ч/год < ${norm} м³/ч`,dc.vent_h_below,db.vent_h_below,' ч',true) +
          `<div class="stat-note">Синяя линия — норматив ${norm} м³/ч<br>(вариант Комфорт)</div>`;
      }
    }
  }

  const SUBTITLES = {
    co2:'CO₂ · максимум по месяцам', temp:'Температура воздуха · среднее по месяцам',
    rh:'Относительная влажность · максимум по месяцам', vent:'Подача свежего воздуха · среднее по месяцам',
  };
  const NORMS = { co2:'ГОСТ 30494-2011', temp:'ГОСТ 30494-2011', rh:'ГОСТ 30494-2011', vent:'СП 54.13330.2022' };

  function renderRoomTabs() {
    const rooms = aptRooms();
    if (!rooms.find(r => r.key === room)) room = rooms[0].key;
    document.getElementById('room-tabs').innerHTML = rooms.map(r =>
      `<button class="room-btn ${r.key===room?'room-btn--active':''}" data-room="${r.key}">${r.label}</button>`
    ).join('');
    document.querySelectorAll('.room-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        room = btn.dataset.room;
        document.querySelectorAll('.room-btn').forEach(b => b.classList.toggle('room-btn--active', b.dataset.room===room));
        refreshMic();
      })
    );
  }

  function refreshMic() {
    document.getElementById('mic-subtitle').textContent = SUBTITLES[metric];
    document.getElementById('mic-norm').textContent     = NORMS[metric];
    document.querySelectorAll('.metric-btn').forEach(b =>
      b.classList.toggle('metric-btn--active', b.dataset.metric === metric)
    );
    document.getElementById('co2-legend').style.display = metric==='co2' ? 'flex' : 'none';
    document.getElementById('leg-comfort').style.background = C.comfort;
    document.getElementById('leg-base').style.background    = C.base;
    buildMicChart();
    updateMicStats();
  }

  /* ═══════════════════════════════════════════════════════════════
     OPEX CHARTS
  ═══════════════════════════════════════════════════════════════ */
  function renderOpexMonthly() {
    destroyChart('opex-monthly');
    const d = aptData();
    const c = d.opex.comfort, b = d.opex.base;

    document.getElementById('opex-legend').innerHTML = [
      [C.heater,'Калорифер П1'],[C.ac,'Кондиционирование'],[C.rad,'Радиаторы'],[C.vent,'Вент. П1'],
    ].map(([col,lbl]) => `<span class="legend-item">${sw(col)}${lbl}</span>`).join('')
    + `<span class="legend-note" style="margin-left:auto">Комфорт (лев) / База (пр)</span>`;

    charts['opex-monthly'] = new Chart(document.getElementById('chart-opex-monthly'), {
      type:'bar',
      data:{labels:MO,datasets:[
        {label:'Калорифер П1',data:c.kalori,stack:'К',backgroundColor:C.heater+'CC',borderWidth:0,borderRadius:2},
        {label:'Кондиц.К',    data:c.kond,  stack:'К',backgroundColor:C.ac+'CC',    borderWidth:0,borderRadius:2},
        {label:'Радиаторы К', data:c.rad,   stack:'К',backgroundColor:C.rad+'CC',   borderWidth:0,borderRadius:2},
        {label:'Вент. П1',    data:c.vent,  stack:'К',backgroundColor:C.vent+'CC',  borderWidth:0,borderRadius:2},
        {label:'Кондиц.Б',   data:b.kond,  stack:'Б',backgroundColor:C.ac+'66',    borderWidth:0,borderRadius:2},
        {label:'Радиаторы Б',data:b.rad,   stack:'Б',backgroundColor:C.rad+'66',   borderWidth:0,borderRadius:2},
      ]},
      options:{
        responsive:true,maintainAspectRatio:false,
        scales:{
          x:{stacked:true,grid:{color:C.grid},ticks:{color:C.txt,autoSkip:false,maxRotation:0}},
          y:{stacked:true,grid:{color:C.grid},beginAtZero:true,ticks:{color:C.txt,callback:v=>v>=1000?Math.round(v/1000)+'к':v}},
        },
        plugins:{legend:{display:false},tooltip:{mode:'index',callbacks:{
          title:ctx=>{
            const i=ctx[0].dataIndex;
            const tC=(c.kalori[i]||0)+(c.kond[i]||0)+(c.rad[i]||0)+(c.vent[i]||0);
            const tB=(b.kond[i]||0)+(b.rad[i]||0);
            return `${MO[i]}  ·  К: ${fr(tC)} ₽  |  Б: ${fr(tB)} ₽`;
          },
          label:ctx=>{
            if (!ctx.parsed.y||ctx.parsed.y===0) return null;
            const stk=ctx.dataset.stack==='К'?'К':'Б';
            let name=ctx.dataset.label.replace(/[КБ]$/,'').replace(/\.$/,'').trim();
            if(name==='Кондиц') name='Кондиционирование';
            return ` ${stk}: ${name} — ${fr(ctx.parsed.y)} ₽`;
          },
        }}},
      },
    });
  }

  function renderOpexBreakdown() {
    destroyChart('opex-breakdown');
    const d = aptData();
    const c = d.opex.comfort, b = d.opex.base;
    const ANC={kalori:c.kalori.reduce((s,v)=>s+v,0),kond:c.kond.reduce((s,v)=>s+v,0),rad:c.rad.reduce((s,v)=>s+v,0),vent:c.vent.reduce((s,v)=>s+v,0)};
    const ANB={kond:b.kond.reduce((s,v)=>s+v,0),rad:b.rad.reduce((s,v)=>s+v,0)};

    document.getElementById('opex-annual').innerHTML = [
      {label:'Калорифер П1',    c:ANC.kalori,b:null,      col:C.heater},
      {label:'Кондиционирование',c:ANC.kond, b:ANB.kond,  col:C.ac},
      {label:'Радиаторы',       c:ANC.rad,   b:ANB.rad,   col:C.rad},
      {label:'Вент. П1',        c:ANC.vent,  b:null,      col:C.vent},
    ].map(it=>`
      <div class="annual-item">
        <div class="annual-item__label">${sw(it.col,8,8)} ${it.label}</div>
        <div class="annual-item__c">${fr(it.c)} ₽</div>
        ${it.b!==null?`<div class="annual-item__b">База: ${fr(it.b)} ₽</div>`:`<div class="annual-item__b">только Комфорт</div>`}
      </div>`).join('');

    const CONS=[
      {label:'Калорифер П1',    c:ANC.kalori,b:0,         col:C.heater},
      {label:'Кондиционирование',c:ANC.kond, b:ANB.kond,  col:C.ac},
      {label:'Радиаторы',       c:ANC.rad,   b:ANB.rad,   col:C.rad},
      {label:'Вент. П1',        c:ANC.vent,  b:0,         col:C.vent},
    ];

    document.getElementById('breakdown-legend').innerHTML =
      CONS.map(c_=>`<span class="legend-item">${sw(c_.col)}${c_.label}</span>`).join('');

    charts['opex-breakdown'] = new Chart(document.getElementById('chart-breakdown'),{
      type:'bar',
      data:{labels:['Комфорт','База'],datasets:CONS.map(c_=>({label:c_.label,data:[c_.c,c_.b],backgroundColor:c_.col,stack:'a',borderRadius:3,borderWidth:0}))},
      options:{
        indexAxis:'y',responsive:true,maintainAspectRatio:false,
        scales:{
          x:{stacked:true,grid:{color:C.grid},ticks:{color:C.txt,callback:v=>v>=1000?Math.round(v/1000)+'к':v}},
          y:{stacked:true,grid:{display:false},ticks:{color:C.txt,font:{size:12}}},
        },
        plugins:{legend:{display:false},tooltip:{filter:i=>i.parsed.x>0,callbacks:{label:ctx=>` ${ctx.dataset.label}: ${fr(ctx.parsed.x)} ₽`}}},
      },
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     CAPEX CHART + INSIGHT
  ═══════════════════════════════════════════════════════════════ */
  function renderCapex() {
    destroyChart('capex');
    const d  = aptData();
    const cc = d.capex.comfort;
    const cb = d.capex.base;
    const dca = cc.total - cb.total; // positive = Comfort more expensive (expected)

    // Legend
    document.getElementById('capex-legend').innerHTML = [
      [C.capex_v,'Вентиляция'],[C.capex_h,'Отопление'],[C.capex_k,'Кондиционирование'],
    ].map(([col,lbl])=>`<span class="legend-item">${sw(col)}${lbl}</span>`).join('');

    charts['capex'] = new Chart(document.getElementById('chart-capex'),{
      type:'bar',
      data:{
        labels:['Комфорт','База'],
        datasets:[
          {label:'Вентиляция',       data:[cc.vent,cb.vent],backgroundColor:C.capex_v,stack:'a',borderRadius:3,borderWidth:0},
          {label:'Отопление',        data:[cc.heat,cb.heat],backgroundColor:C.capex_h,stack:'a',borderRadius:3,borderWidth:0},
          {label:'Кондиционирование',data:[cc.kond,cb.kond],backgroundColor:C.capex_k,stack:'a',borderRadius:3,borderWidth:0},
        ],
      },
      options:{
        indexAxis:'y',responsive:true,maintainAspectRatio:false,
        scales:{
          x:{stacked:true,grid:{color:C.grid},ticks:{color:C.txt,callback:v=>v>=1000?Math.round(v/1000)+'к':v}},
          y:{stacked:true,grid:{display:false},ticks:{color:C.txt,font:{size:12}}},
        },
        plugins:{legend:{display:false},tooltip:{filter:i=>i.parsed.x>0,callbacks:{
          title:ctx=>{const v=ctx[0].label==='Комфорт'?cc.total:cb.total;return `${ctx[0].label}: ${fr(v)} ₽`;},
          label:ctx=>` ${ctx.dataset.label}: ${fr(ctx.parsed.x)} ₽`,
        }}},
      },
    });

    // TCO block
    const t5 = d.tco.y5, t10 = d.tco.y10;
    const d5 = t5.comfort - t5.base, d10 = t10.comfort - t10.base;
    document.getElementById('tco-block').innerHTML = `
      <div class="tco-item">
        <div class="tco-item__label">TCO · 5 лет (CAPEX + OPEX×5)</div>
        <div class="tco-item__c">${fr(t5.comfort)} ₽</div>
        <div class="tco-item__b">База: ${fr(t5.base)} ₽</div>
        <div class="tco-item__d ${d5>0?'tco-item__d--neg':'tco-item__d--pos'}">Δ ${d5>0?'+':''}${fr(d5)} ₽</div>
      </div>
      <div class="tco-item">
        <div class="tco-item__label">TCO · 10 лет (CAPEX + OPEX×10)</div>
        <div class="tco-item__c">${fr(t10.comfort)} ₽</div>
        <div class="tco-item__b">База: ${fr(t10.base)} ₽</div>
        <div class="tco-item__d ${d10>0?'tco-item__d--neg':'tco-item__d--pos'}">Δ ${d10>0?'+':''}${fr(d10)} ₽</div>
      </div>`;

    // Insight card
    const el = document.getElementById('capex-insight');
    const oc = d.totals.comfort, ob = d.totals.base;
    const dOpex = oc - ob;
    const moCost = Math.round(dOpex / 12);

    if (apt === '1c') {
      el.className = 'insight-card';
      el.innerHTML = `
        <div class="insight-card__tag">Стоимость качества · 1С</div>
        <div class="insight-card__title">Комфорт дороже и при покупке, и в эксплуатации — но даёт воздух</div>
        <div class="insight-card__body">
          <strong>Δ CAPEX:</strong> +${fr(dca)} ₽ — бризеры с подогревом вместо клапанов КИВ.<br>
          <strong>Δ OPEX:</strong> +${fr(dOpex)} ₽/год (+${fr(moCost)} ₽/мес) — работа
          калорифера и приточного вентилятора.<br><br>
          В ответ: CO₂ в спальне &lt;800 ppm круглый год vs. превышений нормы 1400 ppm
          в 8–9% часов при Базовом варианте.
        </div>
        <div class="insight-card__highlight">
          TCO за 5 лет: +${fr(d5)} ₽ · за 10 лет: +${fr(d10)} ₽
        </div>`;
    } else {
      el.className = 'insight-card';
      el.innerHTML = `
        <div class="insight-card__tag">Стоимость качества · 2С</div>
        <div class="insight-card__title">Комфорт дороже — осознанная доплата за микроклимат</div>
        <div class="insight-card__body">
          <strong>Δ CAPEX:</strong> +${fr(dca)} ₽ — ХВВП с канальными фанкойлами вместо КИВ.<br>
          <strong>Δ OPEX:</strong> +${fr(dOpex)} ₽/год (+${fr(moCost)} ₽/мес).<br><br>
          Это менее <strong>1% от стоимости квартиры</strong> в CAPEX.
          Ежемесячная разница сопоставима со стоимостью подписки.<br><br>
          В ответ: детская без превышения 1000 ppm CO₂ vs &gt;1400 ppm в Базе.
          Разница критическая для здоровья ребёнка.
        </div>
        <div class="insight-card__highlight">
          TCO за 5 лет: +${fr(d5)} ₽ · за 10 лет: +${fr(d10)} ₽
        </div>`;
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     FULL RENDER + EVENTS
  ═══════════════════════════════════════════════════════════════ */
  function renderAll() {
    renderHero();
    renderKPI();
    renderRoomTabs();
    refreshMic();
    renderOpexMonthly();
    renderOpexBreakdown();
    renderCapex();
  }

  function bindEvents() {
    document.querySelectorAll('.apt-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        apt  = btn.dataset.apt;
        room = 'Bedroom';
        document.querySelectorAll('.apt-btn').forEach(b => b.classList.toggle('apt-btn--active', b.dataset.apt===apt));
        renderAll();
      })
    );
    document.querySelectorAll('.metric-btn').forEach(btn =>
      btn.addEventListener('click', () => { metric = btn.dataset.metric; refreshMic(); })
    );
  }

  document.addEventListener('DOMContentLoaded', () => { bindEvents(); renderAll(); });
})();
