#!/bin/bash
set -e
mkdir -p 'app/(app)/configuracion' 'app/(app)/documentos' 'app/(app)/usuarios' 'components' 'app/(app)/dashboard' 'app' 'lib' 'app/(app)/vencimientos' 'app/(app)/pagos' 'app/(app)/historial' 'app/(app)/siniestros' 'app/(app)/polizas' 'app/(app)' 'app/(app)/clientes'

cat > 'app/globals.css' << 'FILEEOF'
@import "tailwindcss";

:root {
  --navy:       #0F1E35;
  --navy-mid:   #162844;
  --navy-light: #1E3557;
  --gold:       #C9A84C;
  --gold-light: #E2C47A;
  --gold-pale:  #FBF5E6;
  --slate:      #8A9BB5;
  --slate-light:#B8C5D6;
  --surface:    #F4F7FB;
  --white:      #FFFFFF;
  --danger:     #D94F4F;
  --success:    #2E9668;
  --warning:    #D97706;
  --info:       #2563EB;
  --border:     #E2E8F0;

  /* Tema (light por defecto) */
  --bg-page:     var(--surface);
  --bg-card:     var(--white);
  --bg-card-alt: #F4F7FB;
  --bg-hover:    #F8FAFC;
  --text-main:   var(--navy);
  --text-muted:  var(--slate);
  --border-soft: var(--border);
  --shadow-card: 0 1px 3px rgba(15,30,53,.06);
}

[data-theme="dark"] {
  --navy:       #E8EDF5;
  --navy-mid:   #C5D0E0;
  --navy-light: #A8B6CC;
  --gold:       #E2C47A;
  --gold-light: #F0DBA0;
  --gold-pale:  #2A2412;
  --slate:      #8A99B5;
  --slate-light:#6B7A99;
  --surface:    #0B1320;
  --white:      #16202E;
  --danger:     #F47373;
  --success:    #4FBE8C;
  --warning:    #F0A93E;
  --info:       #5B8DEF;
  --border:     #25344A;

  --bg-page:     #0B1320;
  --bg-card:     #16202E;
  --bg-card-alt: #1B2638;
  --bg-hover:    #1E2A3D;
  --text-main:   #E8EDF5;
  --text-muted:  #8A99B5;
  --border-soft: #25344A;
  --shadow-card: 0 1px 3px rgba(0,0,0,.3);
}

* { box-sizing: border-box; }
body { font-family: 'Inter', system-ui, sans-serif; background: var(--bg-page); color: var(--text-main); transition: background-color .2s ease, color .2s ease; }

/* ── SIDEBAR (mantiene navy oscuro en ambos temas) ── */
.sidebar { background: #0F1E35; width: 240px; min-height: 100vh; display: flex; flex-direction: column; flex-shrink: 0; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
.sidebar-logo { padding: 24px 20px 18px; border-bottom: 1px solid rgba(201,168,76,.18); display: flex; align-items: center; gap: 10px; }
.logo-icon { width: 36px; height: 36px; border-radius: 9px; background: rgba(201,168,76,.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 18px; }
.logo-text .brand { font-size: 16px; font-weight: 800; color: #C9A84C; letter-spacing: .04em; text-transform: uppercase; }
.logo-text .sub   { font-size: 10px; color: #8A9BB5; letter-spacing: .1em; text-transform: uppercase; margin-top: 1px; }
.nav-section { padding: 16px 16px 6px; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #8A9BB5; }
.nav-item { display: flex; align-items: center; gap: 9px; padding: 9px 14px; margin: 2px 8px; border-radius: 8px; color: #B8C5D6; font-size: 13.5px; font-weight: 500; cursor: pointer; transition: all .14s; border: none; background: none; width: calc(100% - 16px); text-align: left; text-decoration: none; }
.nav-item:hover { background: rgba(201,168,76,.1); color: #E2C47A; }
.nav-item.active { background: rgba(201,168,76,.16); color: #C9A84C; border-left: 2px solid #C9A84C; margin-left: 6px; padding-left: 12px; }

/* ── LAYOUT ── */
.app-shell { display: flex; height: 100vh; overflow: hidden; }
.main-content { flex: 1; padding: 32px; min-width: 0; overflow-y: auto; height: 100vh; scroll-behavior: smooth; }

.topbar-search { display: flex; justify-content: flex-end; margin-bottom: 18px; }
.topbar-search > button { max-width: 280px; }
@media (max-width: 768px) {
  .topbar-search { justify-content: stretch; margin-bottom: 14px; }
  .topbar-search > button { max-width: 100% !important; }
}

/* ── PAGE HEADER ── */
.page-header { margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
.page-header h1 { font-size: 22px; font-weight: 800; color: var(--navy); }
.page-header p  { font-size: 13px; color: var(--slate); margin-top: 3px; }

/* ── STATS ── */
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
.stat-card { background: var(--bg-card); border-radius: 12px; padding: 18px 20px; border: 1px solid var(--border); }
.stat-card .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--slate); margin-bottom: 6px; }
.stat-card .value { font-size: 26px; font-weight: 800; color: var(--navy); line-height: 1; }
.stat-card .sub   { font-size: 11.5px; color: var(--slate); margin-top: 4px; }

/* ── BUTTONS ── */
.btn-primary { background: var(--gold); color: #0F1E35; font-weight: 700; font-size: 13px; padding: 9px 18px; border-radius: 8px; border: none; cursor: pointer; transition: all .14s; display: inline-flex; align-items: center; gap: 5px; }
.btn-primary:hover { background: var(--gold-light); }
.btn-outline { background: var(--bg-card); color: var(--navy); font-weight: 600; font-size: 13px; padding: 9px 16px; border-radius: 8px; border: 1.5px solid var(--border); cursor: pointer; transition: all .14s; display: inline-flex; align-items: center; gap: 5px; }
.btn-outline:hover { border-color: var(--gold); color: var(--gold); }
.btn-sm { padding: 5px 12px; font-size: 12px; }

/* ── SEARCH / FILTERS ── */
.toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 18px; flex-wrap: wrap; }
.search-wrap { position: relative; }
.search-wrap input { padding: 9px 14px 9px 36px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 13.5px; color: var(--navy); background: var(--bg-card); width: 280px; outline: none; font-family: inherit; transition: border-color .14s; }
.search-wrap input:focus { border-color: var(--gold); }
.search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--slate); font-size: 14px; pointer-events: none; }
.filter-btn { padding: 8px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 600; border: 1.5px solid var(--border); background: var(--bg-card); color: var(--navy); cursor: pointer; transition: all .14s; }
.filter-btn.active { background: var(--navy); border-color: var(--navy); color: white; }
.filter-btn:hover:not(.active) { border-color: var(--gold); color: var(--gold); }

/* ── TABLE ── */
.table-card { background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border); overflow: hidden; }
.table-card table { width: 100%; border-collapse: collapse; }
.table-card thead th { background: #F8FAFC; padding: 11px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--slate); border-bottom: 1px solid var(--border); white-space: nowrap; }
.table-card tbody tr { border-bottom: 1px solid #F1F5FB; transition: background .1s; }
.table-card tbody tr:last-child { border-bottom: none; }
.table-card tbody tr:hover { background: #F8FAFC; }
.table-card tbody td { padding: 12px 14px; font-size: 13.5px; }

/* ── BADGES ── */
.badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: .03em; white-space: nowrap; }
.badge-success { background: #E6F5EF; color: #1A7A4E; }
.badge-warning { background: #FEF3C7; color: #92400E; }
.badge-danger  { background: #FEE2E2; color: #991B1B; }
.badge-neutral { background: #EEF2F8; color: #4A5E78; }
.badge-blue    { background: #DBEAFE; color: #1E40AF; }
.badge-gold    { background: var(--gold-pale); color: #7A5800; }

[data-theme="dark"] .badge-success { background: rgba(79,190,140,.15); color: #6FD4A4; }
[data-theme="dark"] .badge-warning { background: rgba(240,169,62,.15); color: #F0BD6E; }
[data-theme="dark"] .badge-danger  { background: rgba(244,115,115,.15); color: #F79E9E; }
[data-theme="dark"] .badge-neutral { background: rgba(138,153,181,.15); color: #B3C0D9; }
[data-theme="dark"] .badge-blue    { background: rgba(91,141,239,.15); color: #9DBBF7; }
[data-theme="dark"] .badge-gold    { background: rgba(226,196,122,.15); color: #E2C47A; }

/* ── RAMO BADGES ── */
.ramo-incendio    { background: #FEE2E2; color: #991B1B; }
.ramo-multirresgo { background: #DBEAFE; color: #1E40AF; }
.ramo-ascensores  { background: #F0FDF4; color: #166534; }
.ramo-inmuebles   { background: #FEF3C7; color: #92400E; }
.ramo-cristales   { background: #E0F2FE; color: #0C4A6E; }
.ramo-vehiculos   { background: #EDE9FE; color: #4C1D95; }
.ramo-rc          { background: #FDF4FF; color: #701A75; }

/* ── CLIENTE CARDS ── */
.edif-card { background: var(--bg-card); border-radius: 10px; border: 1.5px solid var(--border); padding: 14px 16px; cursor: pointer; transition: all .14s; display: flex; align-items: center; gap: 12px; }
.edif-card:hover { border-color: var(--gold); box-shadow: 0 2px 10px rgba(15,30,53,.07); }
.edif-avatar { width: 38px; height: 38px; border-radius: 9px; background: var(--navy); display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800; color: var(--gold); flex-shrink: 0; }
.edif-name { font-size: 13.5px; font-weight: 700; color: var(--navy); }
.edif-addr { font-size: 11.5px; color: var(--slate); margin-top: 1px; }
.edif-del-btn { color: var(--slate); font-size: 18px; padding: 4px 6px; border-radius: 6px; cursor: pointer; line-height: 1; transition: color .14s; }
.edif-del-btn:hover { color: var(--danger); }

/* ── PÓLIZA CARDS ── */
.poliza-card { background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border); margin-bottom: 12px; overflow: hidden; transition: box-shadow .14s; }
.poliza-card:hover { box-shadow: 0 2px 12px rgba(15,30,53,.08); }
.poliza-card-header { padding: 14px 18px; display: flex; align-items: center; gap: 12px; cursor: pointer; user-select: none; }
.ramo-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.poliza-id   { font-size: 11px; font-family: monospace; color: var(--slate); }
.poliza-ramo { font-weight: 700; font-size: 14px; }
.poliza-card-body { border-top: 0px solid var(--border); transition: border-top .28s; }
.poliza-card-body > div { padding: 0 18px 16px; padding-top: 14px; }
.poliza-card { transition: box-shadow .25s ease; }
.poliza-card:hover { box-shadow: 0 2px 12px rgba(15,30,53,.07); }
.poliza-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 14px; }
.poliza-field .field-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--slate); margin-bottom: 3px; }
.poliza-field .field-val   { font-size: 13.5px; font-weight: 500; color: var(--navy); }

/* ── CUOTA ROWS ── */
.cuotas-section { margin-top: 14px; }
.cuotas-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--slate); margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; }
.cuota-row { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; margin-bottom: 5px; border: 1.5px solid var(--border); background: var(--bg-card); transition: all .14s; }
.cuota-row.paid { background: #F0FDF8; border-color: #BBF7D0; }
.cuota-num { width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; }
.cuota-num.paid    { background: #E6F5EF; color: #1A7A4E; }
.cuota-num.pending { background: #EEF2F8; color: #4A5E78; }
.cuota-info { flex: 1; min-width: 0; }
.cuota-info .cuota-title { font-size: 13px; font-weight: 600; color: var(--navy); }
.cuota-info .cuota-sub   { font-size: 11.5px; color: var(--slate); margin-top: 1px; }
.cuota-paid-tag { font-size: 11px; font-weight: 700; color: #1A7A4E; background: #E6F5EF; padding: 3px 9px; border-radius: 10px; display: flex; align-items: center; gap: 4px; white-space: nowrap; }

/* ── MODALS ── */
.pago-overlay { position: fixed; inset: 0; background: rgba(15,30,53,.5); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 200; opacity: 0; pointer-events: none; transition: opacity .18s; }
.pago-overlay.open { opacity: 1; pointer-events: all; }
.pago-modal { background: var(--bg-card); border-radius: 16px; padding: 28px; width: 420px; max-width: 95vw; box-shadow: 0 24px 60px rgba(15,30,53,.22); transform: translateY(12px); transition: transform .18s; }
.pago-overlay.open .pago-modal { transform: translateY(0); }
.fgroup { margin-bottom: 14px; }
.fgroup label { display: block; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--slate); margin-bottom: 5px; }
.fgroup input, .fgroup select { width: 100%; padding: 10px 13px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 14px; font-family: inherit; color: var(--navy); outline: none; transition: border-color .14s; background: var(--bg-card); }
.fgroup input:focus, .fgroup select:focus { border-color: var(--gold); }

/* ── UPLOAD ZONE ── */
.upload-zone { border: 1.5px dashed var(--slate-light); border-radius: 8px; padding: 12px 16px; text-align: center; color: var(--slate); font-size: 12.5px; cursor: pointer; margin-top: 12px; transition: all .14s; }
.upload-zone:hover { border-color: var(--gold); color: var(--gold); background: var(--gold-pale); }

/* ── VENCIMIENTO ROWS ── */
.venc-urgente { border-left: 3px solid var(--danger); }
.venc-pronto  { border-left: 3px solid var(--warning); }

/* ── PAGINATION ── */
.pagination { display: flex; align-items: center; gap: 6px; margin-top: 14px; justify-content: flex-end; }
.pag-btn { padding: 5px 10px; border-radius: 6px; font-size: 12.5px; font-weight: 600; border: 1.5px solid var(--border); background: var(--bg-card); cursor: pointer; color: var(--navy); }
.pag-btn.active { background: var(--navy); color: white; border-color: var(--navy); }

/* ── INFO CHIPS ── */
.info-chip { display: flex; flex-direction: column; gap: 2px; }
.info-chip .chip-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--slate); }
.info-chip .chip-val   { font-size: 14px; font-weight: 600; color: var(--navy); }


/* ═══════════════════════════════════════════
   RESPONSIVE — Mobile first
   ═══════════════════════════════════════════ */

.hamburger { display: none; }
.hamburger span {
  display: block; width: 18px; height: 2px;
  background: var(--gold); border-radius: 2px; transition: all .2s;
}

.mobile-topbar {
  display: none;
  position: fixed; top: 0; left: 0; right: 0;
  height: 52px; background: var(--navy); z-index: 300;
  align-items: center; padding: 0 16px;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0,0,0,.2);
}
.mobile-topbar img { height: 26px; }
.mobile-topbar .hamburger {
  display: flex; position: static; box-shadow: none;
  background: rgba(255,255,255,.1); width: 36px; height: 36px;
  border-radius: 8px; align-items: center; justify-content: center;
  flex-direction: column; gap: 4px; padding: 8px; border: none; cursor: pointer;
}

.sidebar-overlay {
  display: none; position: fixed; inset: 0;
  background: rgba(15,30,53,.5); z-index: 250; backdrop-filter: blur(2px);
}

@media (max-width: 768px) {
  .mobile-topbar { display: flex; }
  .sidebar-overlay.open { display: block; }

  /* Sidebar drawer */
  .sidebar {
    position: fixed !important; left: -260px; top: 0;
    height: 100vh; z-index: 260; transition: left .25s ease; width: 260px !important;
  }
  .sidebar.open { left: 0; }

  /* Shell & content */
  .app-shell { display: block !important; height: auto !important; overflow: visible !important; }
  .main-content {
    padding: 64px 16px 32px !important;
    width: 100% !important; min-width: 0 !important;
    height: auto !important; overflow-y: visible !important;
    box-sizing: border-box;
  }

  /* Stats: 2x2 */
  .stats-row,
  [style*="gridTemplateColumns: 'repeat(4,1fr)'"] {
    grid-template-columns: repeat(2,1fr) !important;
    gap: 10px !important;
  }

  /* Dashboard 2-col panels → stack */
  [style*="gridTemplateColumns: '1fr 1fr'"],
  [style*="grid-template-columns: 1fr 1fr"] {
    grid-template-columns: 1fr !important;
  }

  /* 3-col → 1 col */
  [style*="gridTemplateColumns: 'repeat(3,1fr)'"],
  [style*="grid-template-columns: repeat(3,1fr)"] {
    grid-template-columns: 1fr !important;
  }

  /* Config auto-fill grid */
  [style*="minmax(320px"] { grid-template-columns: 1fr !important; }

  /* Poliza grid 3-col → 2 col */
  .poliza-grid { grid-template-columns: repeat(2,1fr) !important; }

  /* Filter buttons */
  .filter-btn { padding: 7px 10px; font-size: 12px; }

  /* Tables → mobile list */
  .table-card table { display: none; }
  .table-card .mobile-list { display: block !important; }

  /* Headers that have space-between */
  [style*="justifyContent: 'space-between'"] { flex-wrap: wrap; gap: 10px; }

  /* ── MODALS ── */
  .pago-overlay { align-items: flex-end !important; padding: 0 !important; }
  .pago-modal {
    width: 100% !important; max-width: 100% !important;
    border-radius: 20px 20px 0 0 !important;
    max-height: 90vh !important; overflow-y: auto !important;
    transform: translateY(100%) !important;
    padding: 24px 18px 32px !important;
    box-sizing: border-box !important; margin: 0 !important;
  }
  .pago-overlay.open .pago-modal { transform: translateY(0) !important; }

  /* Modal inner grids → 1 col */
  .pago-modal [style*="grid-template-columns: 1fr 1fr"],
  .pago-modal [style*="gridTemplateColumns: '1fr 1fr'"] {
    grid-template-columns: 1fr !important;
  }
  .pago-modal [style*="gridColumn: 'span 2'"],
  .pago-modal [style*="grid-column: span 2"] {
    grid-column: span 1 !important;
  }

  /* Prevent iOS zoom */
  input, select, textarea { font-size: 16px !important; }

  /* Form row 2col → 1col */
  .form-row-2col { grid-template-columns: 1fr !important; }

  /* Cuota rows wrap */
  .cuota-row { flex-wrap: wrap; gap: 8px; }
}

@media (max-width: 480px) {
  .main-content { padding: 60px 12px 20px !important; }
  .poliza-grid { grid-template-columns: 1fr !important; }
  .stat-card .value { font-size: 20px; }
  .pago-modal { padding: 20px 14px 28px !important; }
}

/* ── Page transition ── */
.main-content > div { animation: pageFadeIn .18s ease; }
@keyframes pageFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Uniform form fields ── */
.fgroup input, .fgroup select {
  height: 42px; padding: 0 13px;
  border: 1.5px solid var(--border); border-radius: 8px;
  font-size: 14px; font-family: inherit; outline: none;
  width: 100%; background: var(--bg-card); color: var(--navy);
  transition: border-color .14s; box-sizing: border-box;
}
.fgroup input:focus, .fgroup select:focus { border-color: var(--gold); }
.fgroup label {
  display: block; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .06em;
  color: var(--slate); margin-bottom: 6px;
}
.fgroup { margin-bottom: 14px; }

/* ── Responsive 2-col form row ── */
.form-row-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 0 14px; }
@media (max-width: 768px) { .form-row-2col { grid-template-columns: 1fr; } }

/* ── Stat card mobile fix ── */
@media (max-width: 768px) {
  .stat-card {
    min-width: 0;
    overflow: hidden;
  }
  .stat-card .label {
    font-size: 10px;
    white-space: normal;
    line-height: 1.3;
  }
  .stat-card .value { font-size: 24px; }
  .stat-card .sub { font-size: 11px; }
  .stat-card > div > div:last-child {
    display: none; /* hide icon on very small cards */
  }
}

/* ── Dashboard layout ── */
.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}
.stat-card-inner {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.stat-card-text { flex: 1; min-width: 0; }
.stat-card-icon {
  border-radius: 10px;
  padding: 10px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dashboard-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.dashboard-panel {
  background: var(--bg-card);
  borderRadius: 12px;
  border: 1px solid var(--border);
  padding: 20px;
  border-radius: 12px;
  min-width: 0;
  overflow: hidden;
}

.acceso-rapido {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-radius: 8px;
  text-decoration: none;
  transition: background .12s;
  margin-bottom: 4px;
}
.acceso-rapido:hover { background: var(--bg-hover); }
.acceso-rapido-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #EEF2F8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .dashboard-stats {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 10px;
  }
  .stat-card-icon { display: none; }
  .dashboard-panels {
    grid-template-columns: 1fr !important;
    gap: 12px;
  }
  .stat-card .label { font-size: 10px; line-height: 1.3; }
  .stat-card .value { font-size: 22px; }
  .stat-card .sub { font-size: 11px; }
}

/* ── Clickable stat card ── */
a.stat-card {
  display: block;
  transition: transform .12s, box-shadow .12s;
}
a.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(15,30,53,.1);
}


FILEEOF
echo '+ app/globals.css'

cat > 'app/layout.tsx' << 'FILEEOF'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fascioli Seguros — Intranet',
  description: 'Sistema interno de gestión de seguros',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('fascioli-theme');
                  var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}


FILEEOF
echo '+ app/layout.tsx'

cat > 'app/(app)/layout.tsx' << 'FILEEOF'
import Sidebar from '@/components/Sidebar'
import GlobalSearch from '@/components/GlobalSearch'
import { AuthProvider } from '@/lib/AuthProvider'
import { ThemeProvider } from '@/lib/ThemeProvider'

export const dynamic = 'force-dynamic'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="app-shell">
          <Sidebar />
          <main className="main-content">
            <div className="topbar-search">
              <GlobalSearch />
            </div>
            {children}
          </main>
        </div>
      </AuthProvider>
    </ThemeProvider>
  )
}


FILEEOF
echo '+ app/(app)/layout.tsx'

cat > 'components/Sidebar.tsx' << 'FILEEOF'
'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthProvider'
import { useTheme } from '@/lib/ThemeProvider'
import {
  LayoutDashboard, Users, FileText, CreditCard,
  Bell, AlertTriangle, FolderOpen, Settings, LogOut, Menu, X, History, UserCog, Sun, Moon
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/clientes',     icon: Users,           label: 'Clientes' },
  { href: '/polizas',      icon: FileText,        label: 'Pólizas' },
  { href: '/pagos',        icon: CreditCard,      label: 'Pagos' },
  { href: '/vencimientos', icon: Bell,            label: 'Vencimientos' },
  { href: '/siniestros',   icon: AlertTriangle,   label: 'Siniestros' },
  { href: '/documentos',   icon: FolderOpen,      label: 'Documentos' },
]

const LIMIT_BYTES = 1 * 1024 * 1024 * 1024

function formatBytes(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export default function Sidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const { esSuperAdmin } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const [open, setOpen]         = useState(false)
  const [usedBytes, setUsedBytes] = useState<number | null>(null)

  useEffect(() => { fetchStorageUsage() }, [])
  useEffect(() => { setOpen(false) }, [pathname])

  async function fetchStorageUsage() {
    try {
      const { data } = await supabase.from('documentos').select('tamanio_bytes')
      if (data) setUsedBytes(data.reduce((s, d) => s + (d.tamanio_bytes || 0), 0))
    } catch {}
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const pct      = usedBytes !== null ? Math.min((usedBytes / LIMIT_BYTES) * 100, 100) : 0
  const barColor = pct > 80 ? '#D94F4F' : pct > 50 ? '#D97706' : '#2E9668'

  return (
    <>
      {/* Mobile topbar */}
      <div className="mobile-topbar">
        <img src="/logo-fascioli.svg" alt="Fascioli Seguros" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C9A84C', display: 'flex', alignItems: 'center', padding: 4 }}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button className="hamburger" onClick={() => setOpen(o => !o)} aria-label="Menú">
            {open ? <X size={16} color="var(--gold)" /> : <><span /><span /><span /></>}
          </button>
        </div>
      </div>

      <div className={`sidebar-overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo" style={{ justifyContent: 'space-between', padding: '20px 16px' }}>
          <img src="/logo-fascioli.svg" alt="Fascioli Seguros"
            style={{ width: '100%', maxWidth: 150, height: 'auto', display: 'block' }} />
          <button
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            style={{ background: 'rgba(201,168,76,.1)', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 7, flexShrink: 0 }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,168,76,.2)')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,168,76,.1)')}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

        <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
          <div className="nav-section">Menú</div>
          {navItems.map(item => (
            <Link key={item.href} href={item.href}
              className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}>
              <item.icon size={17} />
              {item.label}
            </Link>
          ))}
          <div className="nav-section" style={{ marginTop: 10 }}>Sistema</div>
          <Link href="/configuracion"
            className={`nav-item ${pathname.startsWith('/configuracion') ? 'active' : ''}`}>
            <Settings size={17} />
            Configuración
          </Link>
          {esSuperAdmin && (
            <>
              <div className="nav-section" style={{ marginTop: 10 }}>Super Admin</div>
              <Link href="/usuarios"
                className={`nav-item ${pathname.startsWith('/usuarios') ? 'active' : ''}`}>
                <UserCog size={17} />
                Usuarios
              </Link>
              <Link href="/historial"
                className={`nav-item ${pathname.startsWith('/historial') ? 'active' : ''}`}>
                <History size={17} />
                Historial
              </Link>
            </>
          )}
        </nav>

        <div style={{ padding: '12px 16px 0', borderTop: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#8A9BB5', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Almacenamiento
              </span>
              <span style={{ fontSize: 11, color: '#B8C5D6' }}>
                {usedBytes !== null ? `${formatBytes(usedBytes)} / 1 GB` : '...'}
              </span>
            </div>
            <div style={{ background: 'rgba(255,255,255,.1)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: barColor, transition: 'width .6s ease' }} />
            </div>
            {pct > 80 && (
              <div style={{ fontSize: 10, color: '#D94F4F', marginTop: 4, fontWeight: 600 }}>Espacio casi lleno</div>
            )}
          </div>
          <div style={{ paddingBottom: 16 }}>
            <button onClick={handleLogout} className="nav-item"
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#B8C5D6', width: '100%' }}>
              <LogOut size={17} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}


FILEEOF
echo '+ components/Sidebar.tsx'

cat > 'lib/ThemeProvider.tsx' << 'FILEEOF'
'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'
type ThemeContextType = { theme: Theme; toggleTheme: () => void; setTheme: (t: Theme) => void }

const ThemeContext = createContext<ThemeContextType>({ theme: 'light', toggleTheme: () => {}, setTheme: () => {} })

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('fascioli-theme') as Theme | null
    if (stored === 'light' || stored === 'dark') {
      applyTheme(stored)
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      applyTheme(prefersDark ? 'dark' : 'light')
    }
    setMounted(true)

    // Escuchar cambios del sistema si el usuario no eligió manualmente
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    function handleChange(e: MediaQueryListEvent) {
      const manual = localStorage.getItem('fascioli-theme')
      if (!manual) applyTheme(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  function applyTheme(t: Theme) {
    setThemeState(t)
    document.documentElement.setAttribute('data-theme', t)
  }

  function setTheme(t: Theme) {
    localStorage.setItem('fascioli-theme', t)
    applyTheme(t)
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  // Evitar flash incorrecto antes de montar
  if (!mounted) return <>{children}</>

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

FILEEOF
echo '+ lib/ThemeProvider.tsx'

cat > 'app/(app)/polizas/page.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Plus, Search, X, Loader2, Paperclip, ArrowLeft, FileText, CreditCard, Bell, Upload, Download, Trash2, Pencil, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import DatePicker from '@/components/DatePicker'
import ExportButton from '@/components/ExportButton'

// Catalogs loaded from Supabase

function diasHasta(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso), hoy = new Date()
  hoy.setHours(0,0,0,0)
  return Math.round((d.getTime() - hoy.getTime()) / 86400000)
}


function parseFechasCuotaMes(cuotaMes: string): string[] {
  if (!cuotaMes) return []
  const meses: Record<string,string> = { Ene:'01',Feb:'02',Mar:'03',Abr:'04',May:'05',Jun:'06',Jul:'07',Ago:'08',Sep:'09',Oct:'10',Nov:'11',Dic:'12' }
  return cuotaMes.split(' - ').map(item => {
    const parts = item.split('/')
    if (parts.length < 4) return ''
    const d = parts[1].padStart(2,'0'), m = meses[parts[2]] || '01', y = `20${parts[3]}`
    return `${y}-${m}-${d}`
  })
}

function formatValor(valor: string): string {
  if (!valor) return '—'
  if (valor.includes('|')) {
    const [monto, moneda] = valor.split('|')
    const num = Number(monto)
    if (!isNaN(num)) return `${moneda} ${num.toLocaleString('es-UY', { minimumFractionDigits: 0 })}`
  }
  return valor
}

function formatFecha(iso: string | null) {
  if (!iso) return '—'
  const [y,m,d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function estadoBadge(venc: string | null) {
  const d = diasHasta(venc)
  if (d === null) return { label: 'Sin fecha', cls: 'badge-neutral' }
  if (d < 0)     return { label: 'Vencida',   cls: 'badge-danger' }
  if (d <= 30)   return { label: `${d}d`,     cls: 'badge-danger' }
  if (d <= 90)   return { label: `${d}d`,     cls: 'badge-warning' }
  return               { label: formatFecha(venc), cls: 'badge-success' }
}

function addMonthsAndDays(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const targetMonthRaw = m - 1 + months
  const targetYear  = y + Math.floor(targetMonthRaw / 12)
  const targetMonth = targetMonthRaw % 12
  const maxDay = new Date(targetYear, targetMonth + 1, 0).getDate()
  const raw = `${targetYear}-${String(targetMonth + 1).padStart(2,'0')}-${String(Math.min(d, maxDay)).padStart(2,'0')}`
  return raw
}

function CuotasFechas({ cuotas, value, onChange }: {
  cuotas: number; value: string[]; onChange: (v: string[]) => void
}) {
  if (cuotas === 0) return (
    <div style={{ padding: '12px', background: 'var(--bg-card-alt)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
      Ingresá la cantidad de cuotas primero
    </div>
  )
  const dates = Array.from({ length: cuotas }, (_, i) => value[i] || '')
  function handleChange(idx: number, val: string) {
    const next = [...dates]
    next[idx] = val
    if (idx === 0 && val) {
      for (let i = 1; i < cuotas; i++) {
        if (!next[i]) next[i] = addMonthsAndDays(val, i)
      }
    }
    onChange(next)
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
      {dates.map((fecha, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: fecha ? 'var(--navy)' : '#EEF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: fecha ? 'var(--gold)' : 'var(--slate)', flexShrink: 0 }}>{i+1}</div>
          <div style={{ flex: 1 }}>
            <DatePicker value={fecha} onChange={val => handleChange(i, val)}
              placeholder={i === 0 ? 'Fecha 1ª cuota (auto-completa las siguientes)' : `Fecha cuota ${i+1}`} />
          </div>
          {i === 0 && fecha && cuotas > 1 && (
            <button onClick={() => onChange(Array.from({ length: cuotas }, (_, j) => addMonthsAndDays(fecha, j)))}
              style={{ flexShrink: 0, padding: '5px 10px', border: '1.5px solid var(--border-soft)', borderRadius: 7, background: 'var(--bg-card)', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Recalcular
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

function fechasACuotaMes(fechas: string[]): string {
  return fechas.map((f, i) => {
    if (!f) return `${i+1}/?`
    const [y,m,d] = f.split('-')
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    return `${i+1}/${d}/${meses[parseInt(m)-1]}/${y.slice(2)}`
  }).join(' - ')
}

type Cliente  = { id: string; nombre: string; direccion: string }
type Poliza   = { id: string; numero: string; ramo: string; compania: string; vencimiento: string | null; corredor: string; moneda: string; cuotas: number; cuota_mes: string; nota: string | null; cliente_id: string; clientes?: { nombre: string }; doc_count?: number }
type Documento = { id: string; nombre: string; storage_path: string; tipo: string; tamanio_bytes: number; created_at: string }
type Pago     = { id: string; cuota_num: number; fecha: string; metodo: string }
type Paso = 'cliente' | 'poliza'

const extStyle: Record<string, { bg: string; color: string; label: string }> = {
  pdf:  { bg: '#FEE2E2', color: '#991B1B', label: 'PDF' },
  jpg:  { bg: '#DBEAFE', color: '#1E40AF', label: 'IMG' },
  jpeg: { bg: '#DBEAFE', color: '#1E40AF', label: 'IMG' },
  png:  { bg: '#DBEAFE', color: '#1E40AF', label: 'IMG' },
  docx: { bg: '#FEF3C7', color: '#92400E', label: 'DOC' },
  xlsx: { bg: '#E6F5EF', color: '#1A7A4E', label: 'XLS' },
}
function getExt(nombre: string) { return nombre.split('.').pop()?.toLowerCase() || 'pdf' }
function formatBytes(b: number) {
  if (!b) return '—'
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export default function PolizasPage() {
  const supabase = createClient()

  const [polizas, setPolizas]         = useState<Poliza[]>([])
  const [clientes, setClientes]       = useState<Cliente[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filtroRamo, setFiltroRamo]   = useState('Todos')
  const [catalogos, setCatalogos]     = useState<{ramos:string[];companias:string[];corredores:string[];monedas:string[]}>({ramos:[],companias:[],corredores:[],monedas:[]})

  // Row menu
  const [editando, setEditando]       = useState<Poliza | null>(null)
  const [editForm, setEditForm]       = useState<Partial<Poliza>>({})
  const [savingEdit, setSavingEdit]         = useState(false)
  const [editCamposRamo, setEditCamposRamo]     = useState<{id:string;nombre:string;tipo:string;opciones:string|null}[]>([])
  const [editValores, setEditValores]           = useState<Record<string,string>>({})
  const [editPagosCount, setEditPagosCount]     = useState(0)
  const [confirmEliminar, setConfirmEliminar]   = useState<Poliza | null>(null)
  const [eliminando, setEliminando]              = useState(false)
  const [editFechasCuotas, setEditFechasCuotas] = useState<string[]>([])

  // Detail view
  const [detalle, setDetalle]         = useState<Poliza | null>(null)
  const [detalleDocs, setDetalleDocs] = useState<Documento[]>([])
  const [detallePagos, setDetallePagos] = useState<Pago[]>([])
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [showPagoModal, setShowPagoModal]   = useState<number | null>(null) // cuota_num
  const [pagoForm, setPagoForm]             = useState({ fecha: new Date().toISOString().slice(0,10), metodo: 'Transferencia', referencia: '' })
  const [savingPago, setSavingPago]         = useState(false)
  const [metodos, setMetodos]               = useState<string[]>([])
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const fileInputRef = useState<HTMLInputElement | null>(null)

  // New poliza modal
  const [showModal, setShowModal]     = useState(false)
  const [paso, setPaso]               = useState<Paso>('cliente')
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)
  const [saving, setSaving]           = useState(false)
  const [form, setForm]               = useState({ ramo: '', compania: '', numero: '', vencimiento: '', corredor: '', moneda: '', cuotas: '', fechasCuotas: [] as string[], nota: '' })
  const [camposRamo, setCamposRamo]   = useState<{id:string;nombre:string;tipo:string;opciones:string|null}[]>([])
  const [valoresCampos, setValoresCampos] = useState<Record<string,string>>({})

  useEffect(() => {
    fetchPolizas()
    fetchClientes()
    fetchCatalogos()
    supabase.from('metodos_pago').select('nombre').order('nombre').then(({ data }) => {
      if (data) setMetodos(data.map((x: any) => x.nombre))
    })
  }, [])

  async function fetchPolizas() {
    setLoading(true)
    const { data } = await supabase.from('polizas').select('*, clientes(nombre)').order('created_at', { ascending: false })
    if (data) {
      const ids = data.map((p: any) => p.id)
      const { data: docs } = await supabase.from('documentos').select('poliza_id').in('poliza_id', ids)
      const countMap: Record<string, number> = {}
      ;(docs || []).forEach((d: any) => { countMap[d.poliza_id] = (countMap[d.poliza_id] || 0) + 1 })
      setPolizas(data.map((p: any) => ({ ...p, doc_count: countMap[p.id] || 0 })))
    }
    setLoading(false)
  }

  async function fetchClientes() {
    const { data } = await supabase.from('clientes').select('id, nombre, direccion').order('nombre')
    if (data) setClientes(data)
  }

  async function fetchCatalogos() {
    const [r, c, co, m] = await Promise.all([
      supabase.from('ramos').select('nombre').order('nombre'),
      supabase.from('companias').select('nombre').order('nombre'),
      supabase.from('corredores').select('nombre').order('nombre'),
      supabase.from('monedas').select('nombre').order('nombre'),
    ])
    setCatalogos({
      ramos:     (r.data || []).map((x:any) => x.nombre),
      companias: (c.data || []).map((x:any) => x.nombre),
      corredores:(co.data || []).map((x:any) => x.nombre),
      monedas:   (m.data || []).map((x:any) => x.nombre),
    })
  }

  const [detalleExtras, setDetalleExtras] = useState<{nombre:string;valor:string}[]>([])

  async function abrirDetalle(p: Poliza) {
    setDetalle(p)
    setLoadingDetalle(true)
    const [{ data: docs }, { data: pagos }, { data: extras }] = await Promise.all([
      supabase.from('documentos').select('*').eq('poliza_id', p.id).order('created_at', { ascending: false }),
      supabase.from('pagos').select('*').eq('poliza_id', p.id).order('cuota_num'),
      supabase.from('poliza_campos').select('valor, campos_ramo(nombre)').eq('poliza_id', p.id),
    ])
    setDetalleDocs(docs || [])
    setDetallePagos(pagos || [])
    setDetalleExtras((extras || []).map((e: any) => ({ nombre: e.campos_ramo?.nombre || '', valor: e.valor })).filter(e => e.nombre && e.valor))
    setLoadingDetalle(false)
  }

  async function descargarDoc(doc: Documento) {
    const { data } = await supabase.storage.from('documentos').createSignedUrl(doc.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function eliminarDoc(doc: Documento) {
    if (!confirm(`¿Eliminar "${doc.nombre}"?`)) return
    await supabase.storage.from('documentos').remove([doc.storage_path])
    await supabase.from('documentos').delete().eq('id', doc.id)
    if (detalle) abrirDetalle(detalle)
  }

  async function registrarPago(cuotaNum: number) {
    if (!detalle) return
    setSavingPago(true)
    await supabase.from('pagos').upsert([{
      poliza_id:  detalle.id,
      cuota_num:  cuotaNum,
      fecha:      pagoForm.fecha,
      metodo:     pagoForm.metodo,
      referencia: pagoForm.referencia,
    }], { onConflict: 'poliza_id,cuota_num' })
    setShowPagoModal(null)
    setSavingPago(false)
    await abrirDetalle(detalle)
    // Refresh polizas list in background
    fetchPolizas()
  }

  async function deshacerPago(cuotaNum: number) {
    if (!detalle) return
    if (!confirm('¿Deshacer este pago?')) return
    await supabase.from('pagos').delete().eq('poliza_id', detalle.id).eq('cuota_num', cuotaNum)
    await abrirDetalle(detalle)
    fetchPolizas()
  }

  async function confirmarEliminarPoliza() {
    if (!confirmEliminar) return
    const p = confirmEliminar
    setEliminando(true)
    // Borrar documentos del storage primero
    const { data: docs } = await supabase.from('documentos').select('storage_path').eq('poliza_id', p.id)
    if (docs && docs.length > 0) {
      await supabase.storage.from('documentos').remove(docs.map(d => d.storage_path))
    }
    // Borrar registros relacionados antes de la póliza
    await supabase.from('pagos').delete().eq('poliza_id', p.id)
    await supabase.from('documentos').delete().eq('poliza_id', p.id)
    await supabase.from('poliza_campos').delete().eq('poliza_id', p.id)
    await supabase.from('siniestros').delete().eq('poliza_id', p.id)
    const { error } = await supabase.from('polizas').delete().eq('id', p.id)
    setEliminando(false)
    if (error) {
      console.error('Error eliminando póliza:', error)
      alert(`No se pudo eliminar: ${error.message}`)
      return
    }
    setConfirmEliminar(null)
    if (detalle?.id === p.id) setDetalle(null)
    await fetchPolizas()
  }

  async function guardarEdicion() {
    if (!editando) return
    setSavingEdit(true)
    const nCuotas = Number(editForm.cuotas) || editando.cuotas || 0
    const nuevasCuotaMes = editFechasCuotas.slice(0, nCuotas).map((f, i) => {
      if (!f) return `${i+1}/?`
      const [y,m,d] = f.split('-')
      const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
      return `${i+1}/${d}/${meses[parseInt(m)-1]}/${y.slice(2)}`
    }).join(' - ')
    await supabase.from('polizas').update({
      numero:      editForm.numero,
      ramo:        editForm.ramo,
      compania:    editForm.compania,
      corredor:    editForm.corredor,
      moneda:      editForm.moneda,
      vencimiento: editForm.vencimiento || null,
      nota:        editForm.nota || null,
      cuotas:      nCuotas,
      cuota_mes:   nuevasCuotaMes,
    }).eq('id', editando.id)
    // Save/update campos dinamicos
    if (editCamposRamo.length > 0) {
      const upserts = Object.entries(editValores)
        .filter(([_, v]) => v.trim())
        .map(([campoId, valor]) => ({ poliza_id: editando.id, campo_id: campoId, valor }))
      if (upserts.length > 0) {
        await supabase.from('poliza_campos').upsert(upserts, { onConflict: 'poliza_id,campo_id' })
      }
      // Delete removed values
      const camposConValor = Object.entries(editValores).filter(([_,v]) => !v.trim()).map(([id]) => id)
      if (camposConValor.length > 0) {
        await supabase.from('poliza_campos').delete().eq('poliza_id', editando.id).in('campo_id', camposConValor)
      }
    }
    setEditando(null)
    setSavingEdit(false)
    await fetchPolizas()
  }

  async function guardarPoliza() {
    if (!clienteSeleccionado || !form.numero.trim()) return
    const nCuotas = parseInt(form.cuotas) || 0
    if (nCuotas < 1) { alert('Ingresá al menos 1 cuota'); return }
    if (!form.fechasCuotas[0]) { alert('Ingresá la fecha de la primera cuota'); return }
    setSaving(true)
    const { data: polData } = await supabase.from('polizas').insert([{
      cliente_id:  clienteSeleccionado.id,
      ramo: form.ramo, compania: form.compania, numero: form.numero,
      vencimiento: form.vencimiento || null, corredor: form.corredor,
      moneda: form.moneda, cuotas: nCuotas,
      cuota_mes: fechasACuotaMes(form.fechasCuotas), nota: form.nota || null,
    }]).select().single()
    if (polData) {
      const inserts = Object.entries(valoresCampos)
        .filter(([_, v]) => v.trim())
        .map(([campoId, valor]) => ({ poliza_id: (polData as any).id, campo_id: campoId, valor }))
      if (inserts.length > 0) await supabase.from('poliza_campos').insert(inserts)
    }
    cerrarModal()
    setSaving(false)
    await fetchPolizas()
  }

  function abrirModal() {
    setPaso('cliente'); setClienteSearch(''); setClienteSeleccionado(null)
    setForm({ ramo: '', compania: '', numero: '', vencimiento: '', corredor: '', moneda: '', cuotas: '', fechasCuotas: [], nota: '' })
    setCamposRamo([])
    setValoresCampos({})
    setShowModal(true)
  }
  function cerrarModal() { setShowModal(false); setClienteSeleccionado(null); setPaso('cliente') }

  const RAMOS_FILTRO = ['Todos', ...catalogos.ramos]
  const filtradas = polizas.filter(p => {
    const q = search.toLowerCase()
    const nombre = p.clientes?.nombre || ''
    return (!q || nombre.toLowerCase().includes(q) || p.numero.toLowerCase().includes(q) || p.ramo.toLowerCase().includes(q)) &&
           (filtroRamo === 'Todos' || p.ramo === filtroRamo)
  })
  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    (c.direccion || '').toLowerCase().includes(clienteSearch.toLowerCase())
  )

  // ── DETALLE VIEW ──────────────────────────────────────────────────────────
  if (detalle) {
    const { label, cls } = estadoBadge(detalle.vencimiento)
    const pagosMap: Record<number, Pago> = {}
    detallePagos.forEach(pg => { pagosMap[pg.cuota_num] = pg })
    const pct = detalle.cuotas > 0 ? Math.round(detallePagos.length / detalle.cuotas * 100) : 0

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Pólizas</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{detalle.ramo} · {detalle.numero}</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <button onClick={() => setDetalle(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
            <ArrowLeft size={14} /> Volver a pólizas
          </button>
          <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onMouseDown={e => { e.stopPropagation() }}
            onClick={e => {
              e.stopPropagation()
              setEditando(detalle)
              setEditForm({ numero: detalle.numero, ramo: detalle.ramo, compania: detalle.compania, corredor: detalle.corredor, moneda: detalle.moneda, vencimiento: detalle.vencimiento, nota: detalle.nota, cuotas: detalle.cuotas })
              setEditPagosCount(detallePagos.length)
              setEditFechasCuotas(parseFechasCuotaMes(detalle.cuota_mes || ''))
              supabase.from('ramos').select('id').eq('nombre', detalle.ramo).single().then(({ data: ramoData }) => {
                if (!ramoData) { setEditCamposRamo([]); setEditValores({}); return }
                Promise.all([
                  supabase.from('campos_ramo').select('*').eq('ramo_id', ramoData.id).order('orden'),
                  supabase.from('poliza_campos').select('campo_id, valor').eq('poliza_id', detalle.id),
                ]).then(([{ data: campos }, { data: valores }]) => {
                  setEditCamposRamo(campos || [])
                  const map: Record<string,string> = {}
                  ;(valores || []).forEach((v: any) => { map[v.campo_id] = v.valor })
                  setEditValores(map)
                })
              })
            }}>
            <Pencil size={14} /> Editar póliza
          </button>
        </div>

        {/* Header card */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span className="badge badge-neutral" style={{ fontSize: 13 }}>{detalle.ramo}</span>
                <span className={`badge ${cls}`}>{label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace' }}>{detalle.numero}</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>{detalle.clientes?.nombre}</div>
              {detalle.nota && (
                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-main)', background: 'var(--bg-card-alt)', borderLeft: '3px solid var(--gold)', padding: '6px 12px', borderRadius: 6 }}>
                  {detalle.nota.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[
                { label: 'Compañía',    value: detalle.compania },
                { label: 'Corredor',    value: detalle.corredor },
                { label: 'Moneda',      value: detalle.moneda },
                { label: 'Vencimiento', value: formatFecha(detalle.vencimiento) },
                { label: 'Cuotas',      value: detalle.cuotas || '—' },
                { label: 'Pagadas',     value: `${detallePagos.length}/${detalle.cuotas}` },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 2 }}>{f.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Campos extra por ramo */}
        {detalleExtras.length > 0 && (
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', padding: '16px 24px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
              Datos específicos — {detalle.ramo}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {detalleExtras.map(e => (
                <div key={e.nombre}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 2 }}>{e.nombre}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>{formatValor(e.valor)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cuotas */}
        {detalle.cuotas > 0 && (
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>
                Cuotas <span style={{ fontWeight: 400 }}>({detallePagos.length}/{detalle.cuotas} pagadas)</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? 'var(--success)' : 'var(--slate)' }}>{pct}%</span>
            </div>
            <div style={{ background: 'var(--border)', borderRadius: 4, height: 5, marginBottom: 14 }}>
              <div style={{ background: pct === 100 ? 'var(--success)' : 'var(--gold)', height: '100%', borderRadius: 4, width: `${pct}%`, transition: 'width .4s' }} />
            </div>
            {/* Parse cuota_mes to show dates */}
            {detalle.cuota_mes && detalle.cuota_mes.split(' - ').map((item, i) => {
              const n = i + 1
              const pago = pagosMap[n]
              const fechaStr = item.split('/').slice(1).join('/')
              return (
                <div key={n} className={`cuota-row ${pago ? 'paid' : ''}`}>
                  <div className={`cuota-num ${pago ? 'paid' : 'pending'}`}>{n}</div>
                  <div className="cuota-info">
                    <div className="cuota-title">Cuota {n} — {fechaStr}</div>
                    <div className="cuota-sub">{pago ? `Pagado ${pago.fecha} · ${pago.metodo}` : 'Pendiente'}</div>
                  </div>
                  {pago ? (
                    <>
                      <span className="cuota-paid-tag">Pagada</span>
                      <button className="btn-outline btn-sm" style={{ fontSize: 11, marginLeft: 6 }}
                        onClick={() => deshacerPago(n)}>Deshacer</button>
                    </>
                  ) : (
                    <button className="btn-primary btn-sm"
                      onClick={() => { setPagoForm({ fecha: new Date().toISOString().slice(0,10), metodo: metodos[0] || 'Transferencia', referencia: '' }); setShowPagoModal(n) }}>
                      + Registrar pago
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Documentos */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', padding: '18px 20px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
            Documentos {detalleDocs.length > 0 && `(${detalleDocs.length})`}
          </div>
          {loadingDetalle ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cargando...</div>
          ) : detalleDocs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin documentos adjuntos</div>
          ) : detalleDocs.map(doc => {
            const ext = extStyle[getExt(doc.nombre)] || extStyle.pdf
            return (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F1F5FB' }}>
                <div style={{ width: 34, height: 34, background: ext.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: ext.color }}>{ext.label}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{doc.tipo} · {formatBytes(doc.tamanio_bytes)}</div>
                </div>
                <button className="btn-outline btn-sm" onClick={() => descargarDoc(doc)}><Download size={13} /></button>
                <button className="btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => eliminarDoc(doc)}><Trash2 size={13} /></button>
              </div>
            )
          })}
        </div>

      {/* Modal editar póliza */}
      {editando && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setEditando(null) }}>
          <div className="pago-modal" style={{ width: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0 }} onClick={e => e.stopPropagation()}>
            {/* Sticky header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Editar póliza</h3>
              <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}><X size={18} /></button>
            </div>
            {/* Scrollable body */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div className="fgroup"><label>N° Póliza</label>
                <input value={editForm.numero || ''} onChange={e => setEditForm(p => ({...p, numero: e.target.value}))} /></div>
              <div className="fgroup"><label>Ramo</label>
                <select value={editForm.ramo || ''} onChange={async e => {
                  const nuevoRamo = e.target.value
                  setEditForm(p => ({...p, ramo: nuevoRamo}))
                  setEditValores({})
                  if (nuevoRamo) {
                    const { data: rd } = await supabase.from('ramos').select('id').eq('nombre', nuevoRamo).single()
                    if (rd) { const { data: c } = await supabase.from('campos_ramo').select('*').eq('ramo_id', rd.id).order('orden'); setEditCamposRamo(c || []) }
                    else setEditCamposRamo([])
                  } else setEditCamposRamo([])
                }}>
                  {catalogos.ramos.map((r:string) => <option key={r}>{r}</option>)}
                </select></div>
              <div className="fgroup"><label>Compañía</label>
                <select value={editForm.compania || ''} onChange={e => setEditForm(p => ({...p, compania: e.target.value}))}>
                  {catalogos.companias.map((c:string) => <option key={c}>{c}</option>)}
                </select></div>
              <div className="fgroup"><label>Corredor</label>
                <select value={editForm.corredor || ''} onChange={e => setEditForm(p => ({...p, corredor: e.target.value}))}>
                  {catalogos.corredores.map((c:string) => <option key={c}>{c}</option>)}
                </select></div>
              <div className="fgroup"><label>Vencimiento</label>
                <DatePicker value={editForm.vencimiento || ''} onChange={v => setEditForm(p => ({...p, vencimiento: v}))} /></div>
              <div className="fgroup"><label>Moneda</label>
                <select value={editForm.moneda || ''} onChange={e => setEditForm(p => ({...p, moneda: e.target.value}))}>
                  {catalogos.monedas.map((m:string) => <option key={m}>{m}</option>)}
                </select></div>
              <div className="fgroup">
                <label>Cantidad de cuotas</label>
                <input type="number" value={editForm.cuotas || ''} min={editPagosCount} max={36}
                  onChange={e => {
                    const n = parseInt(e.target.value) || 0
                    if (n < editPagosCount) return
                    setEditForm(p => ({...p, cuotas: n}))
                    if (n > editFechasCuotas.length) {
                      const base = editFechasCuotas[0] || ''
                      setEditFechasCuotas(Array.from({ length: n }, (_, i) => editFechasCuotas[i] || (base ? addMonthsAndDays(base, i) : '')))
                    } else {
                      setEditFechasCuotas(prev => prev.slice(0, n))
                    }
                  }} />
                {editPagosCount > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                    Mínimo {editPagosCount} ({editPagosCount} ya pagada{editPagosCount > 1 ? 's' : ''})
                  </div>
                )}
              </div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Nota (opcional)</label>
                <textarea value={editForm.nota || ''} onChange={e => setEditForm(p => ({...p, nota: e.target.value}))} rows={2}
                  style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: 'var(--text-main)' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--gold)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
              </div>
            </div>
            {editCamposRamo.length > 0 && (
              <div style={{ background: 'var(--bg-card-alt)', borderRadius: 10, padding: '14px', marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
                  Datos específicos — {editForm.ramo}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                  {editCamposRamo.map((campo: any) => (
                    <div key={campo.id} className="fgroup">
                      <label>{campo.nombre}</label>
                      {campo.tipo === 'numero_moneda' ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <select value={(editValores[campo.id] || '').split('|')[1] || 'U$S'}
                            onChange={e => { const m = (editValores[campo.id] || '').split('|')[0] || ''; setEditValores(p => ({...p, [campo.id]: `${m}|${e.target.value}`})) }}
                            style={{ flex: 1, minWidth: 70 }}><option>U$S</option><option>$</option><option>€</option></select>
                          <input type="number" value={(editValores[campo.id] || '').split('|')[0] || ''}
                            onChange={e => { const mon = (editValores[campo.id] || '').split('|')[1] || 'U$S'; setEditValores(p => ({...p, [campo.id]: `${e.target.value}|${mon}`})) }}
                            placeholder="0" style={{ flex: 3 }} />
                        </div>
                      ) : campo.tipo === 'select' && campo.opciones ? (
                        <select value={editValores[campo.id] || ''} onChange={e => setEditValores(p => ({...p, [campo.id]: e.target.value}))}
                          style={{ color: editValores[campo.id] ? 'var(--navy)' : 'var(--slate)' }}>
                          <option value="">— Seleccionar —</option>
                          {campo.opciones.split(',').map((o: string) => <option key={o.trim()} value={o.trim()}>{o.trim()}</option>)}
                        </select>
                      ) : campo.tipo === 'boolean' ? (
                        <select value={editValores[campo.id] || ''} onChange={e => setEditValores(p => ({...p, [campo.id]: e.target.value}))}>
                          <option value="">— Seleccionar —</option><option>Sí</option><option>No</option>
                        </select>
                      ) : (
                        <input type={campo.tipo === 'numero' ? 'number' : 'text'} value={editValores[campo.id] || ''}
                          onChange={e => setEditValores(p => ({...p, [campo.id]: e.target.value}))} placeholder={campo.nombre} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {editFechasCuotas.length > 0 && (
              <div className="fgroup" style={{ marginTop: 8 }}>
                <label>Fechas de vencimiento por cuota</label>
                <CuotasFechas cuotas={Number(editForm.cuotas) || editFechasCuotas.length} value={editFechasCuotas} onChange={setEditFechasCuotas} />
              </div>
            )}
            </div>
            {/* Sticky footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 24px', borderTop: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-card)', borderRadius: '0 0 14px 14px' }}>
              <button className="btn-outline" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn-primary" onClick={guardarEdicion} disabled={savingEdit}>
                {savingEdit ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Pólizas</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{loading ? 'Cargando...' : `${polizas.length} pólizas en cartera`}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ExportButton
            titulo="Cartera de pólizas"
            subtitulo={`${filtradas.length} pólizas`}
            columnas={[
              { header: 'N° Póliza', key: 'numero', width: 80 },
              { header: 'Cliente', key: 'cliente', width: 140 },
              { header: 'Ramo', key: 'ramo', width: 80 },
              { header: 'Compañía', key: 'compania', width: 80 },
              { header: 'Corredor', key: 'corredor', width: 90 },
              { header: 'Vencimiento', key: 'vencimiento', width: 80 },
              { header: 'Moneda', key: 'moneda', width: 50 },
              { header: 'Estado', key: 'estado', width: 70 },
            ]}
            filas={filtradas.map(p => ({
              numero: p.numero,
              cliente: p.clientes?.nombre || '',
              ramo: p.ramo,
              compania: p.compania,
              corredor: p.corredor,
              vencimiento: formatFecha(p.vencimiento),
              moneda: p.moneda,
              estado: estadoBadge(p.vencimiento).label,
            }))}
            filename="cartera-polizas-fascioli"
          />
          <button className="btn-primary" onClick={abrirModal}><Plus size={15} /> Nueva póliza</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input placeholder="Buscar cliente o N° póliza..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 280, background: 'var(--bg-card)', color: 'var(--text-main)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {RAMOS_FILTRO.map(t => <button key={t} onClick={() => setFiltroRamo(t)} className={`filter-btn ${filtroRamo === t ? 'active' : ''}`}>{t}</button>)}
        </div>
      </div>

      <div className="table-card">
        <table>
          <colgroup>
            <col style={{ width: 130 }} /><col style={{ width: 100 }} /><col style={{ width: 200 }} /><col style={{ width: 130 }} /><col style={{ width: 100 }} />
            <col style={{ width: 120 }} /><col style={{ width: 130 }} /><col style={{ width: 100 }} /><col style={{ width: 80 }} /><col style={{ width: 130 }} /><col style={{ width: 100 }} />
          </colgroup>
          <thead>
            <tr>
              <th>N° Póliza</th><th>Cliente</th><th>Ramo</th>
              <th>Compañía</th><th>Vencimiento</th><th>Moneda</th><th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
              </td></tr>
            ) : filtradas.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay pólizas</div>
              </td></tr>
            ) : filtradas.map(p => {
              const { label, cls } = estadoBadge(p.vencimiento)
              return (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => abrirDetalle(p)}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{p.numero}</td>
                  <td style={{ fontWeight: 600 }}>{p.clientes?.nombre || '—'}</td>
                  <td><span className="badge badge-neutral">{p.ramo}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{p.compania}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatFecha(p.vencimiento)}</td>
                  <td style={{ fontSize: 12 }}>{p.moneda}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={`badge ${cls}`}>{label}</span>
                      {(p.doc_count ?? 0) > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--text-muted)', fontSize: 11 }}>
                          <Paperclip size={11} />{p.doc_count}
                        </span>
                      )}
                    </div>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn-outline btn-sm"
                      style={{ color: 'var(--danger)', borderColor: '#FEE2E2', fontSize: 12 }}
                      onClick={() => setConfirmEliminar(p)}>
                      <Trash2 size={12} /> Eliminar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="mobile-list" style={{ display: 'none' }}>
          {filtradas.map(p => {
            const { label, cls } = estadoBadge(p.vencimiento)
            return (
              <div key={p.id} style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5FB', cursor: 'pointer' }} onClick={() => abrirDetalle(p)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.clientes?.nombre || '—'}</div>
                  <span className={`badge ${cls}`}>{label}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  <span className="badge badge-neutral" style={{ marginRight: 6 }}>{p.ramo}</span>
                  <span style={{ fontFamily: 'monospace' }}>{p.numero}</span>
                  {' · '}{p.compania}
                  {(p.doc_count ?? 0) > 0 && <span style={{ marginLeft: 8 }}><Paperclip size={11} /> {p.doc_count}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal nueva póliza */}
      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) cerrarModal() }}>
          <div className="pago-modal" style={{ width: 540, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)' }}>
                  {paso === 'cliente' ? 'Seleccionar cliente' : 'Nueva póliza'}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                  Paso {paso === 'cliente' ? '1' : '2'} de 2{paso === 'poliza' && clienteSeleccionado ? ` — ${clienteSeleccionado.nombre}` : ''}
                </div>
              </div>
              <button onClick={cerrarModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
              {['cliente','poliza'].map((p, i) => {
                const idx = ['cliente','poliza'].indexOf(paso)
                return <div key={p} style={{ flex: 1, height: 3, borderRadius: 3, background: i <= idx ? 'var(--gold)' : 'var(--border)', transition: 'background .2s' }} />
              })}
            </div>

            {paso === 'cliente' && (
              <>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input placeholder="Buscar cliente..." value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} autoFocus
                    style={{ width: '100%', padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-main)' }} />
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {clientesFiltrados.map(c => (
                    <div key={c.id} onClick={() => { setClienteSeleccionado(c); setPaso('poliza') }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 9, border: '1.5px solid var(--border-soft)', cursor: 'pointer', background: 'var(--bg-card)', transition: 'all .12s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--gold)'; (e.currentTarget as HTMLDivElement).style.background='var(--gold-pale)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--border)'; (e.currentTarget as HTMLDivElement).style.background='white' }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--gold)', fontSize: 14, flexShrink: 0 }}>
                        {c.nombre.trim()[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>{c.nombre}</div>
                        {c.direccion && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.direccion}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {paso === 'poliza' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                  <div className="fgroup">
                    <label>Ramo *</label>
                    <select value={form.ramo} onChange={async e => {
                      const nuevoRamo = e.target.value
                      setForm({ ...form, ramo: nuevoRamo })
                      setValoresCampos({})
                      if (nuevoRamo) {
                        const { data: ramoData } = await supabase.from('ramos').select('id').eq('nombre', nuevoRamo).single()
                        if (ramoData) {
                          const { data } = await supabase.from('campos_ramo').select('*').eq('ramo_id', ramoData.id).order('orden')
                          setCamposRamo(data || [])
                        } else setCamposRamo([])
                      } else setCamposRamo([])
                    }} style={{ color: form.ramo ? 'var(--navy)' : 'var(--slate)' }}>
                      <option value="">— Seleccionar —</option>
                      {catalogos.ramos.map((r:string) => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="fgroup">
                    <label>N° Póliza *</label>
                    <input value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} placeholder="Ej: 4309338" autoFocus />
                  </div>
                  <div className="fgroup">
                    <label>Compañía *</label>
                    <select value={form.compania} onChange={e => setForm({ ...form, compania: e.target.value })} style={{ color: form.compania ? 'var(--navy)' : 'var(--slate)' }}>
                      <option value="">— Seleccionar —</option>
                      {catalogos.companias.map((c:string) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="fgroup">
                    <label>Corredor *</label>
                    <select value={form.corredor} onChange={e => setForm({ ...form, corredor: e.target.value })} style={{ color: form.corredor ? 'var(--navy)' : 'var(--slate)' }}>
                      <option value="">— Seleccionar —</option>
                      {catalogos.corredores.map((c:string) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="fgroup">
                    <label>Vencimiento *</label>
                    <DatePicker value={form.vencimiento} onChange={v => setForm({ ...form, vencimiento: v })} placeholder="Seleccionar fecha" />
                  </div>
                  <div className="fgroup">
                    <label>Moneda *</label>
                    <select value={form.moneda} onChange={e => setForm({ ...form, moneda: e.target.value })} style={{ color: form.moneda ? 'var(--navy)' : 'var(--slate)' }}>
                      <option value="">— Seleccionar —</option>
                      {(catalogos.monedas || []).map((m:string) => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="fgroup">
                    <label>Cantidad de cuotas *</label>
                    <input type="number" min="1" max="36" value={form.cuotas} onChange={e => setForm({ ...form, cuotas: e.target.value, fechasCuotas: [] })} placeholder="Ej: 10" />
                  </div>
                  <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                    <label>Fechas de vencimiento por cuota *<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>— ingresá la cantidad de cuotas primero</span></label>
                    <CuotasFechas cuotas={parseInt(form.cuotas) || 0} value={form.fechasCuotas} onChange={v => setForm({ ...form, fechasCuotas: v })} />
                  </div>
                  {camposRamo.length > 0 && (
                    <div style={{ gridColumn: 'span 2', background: 'var(--bg-card-alt)', borderRadius: 10, padding: '14px', marginBottom: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
                        Datos específicos de {form.ramo}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                        {camposRamo.map(campo => (
                          <div key={campo.id} className="fgroup">
                            <label>{campo.nombre}</label>
                            {campo.tipo === 'select' && campo.opciones ? (
                              <select value={valoresCampos[campo.id] || ''} onChange={e => setValoresCampos(p => ({...p, [campo.id]: e.target.value}))}
                                style={{ color: valoresCampos[campo.id] ? 'var(--navy)' : 'var(--slate)' }}>
                                <option value="">— Seleccionar —</option>
                                {campo.opciones.split(',').map(o => <option key={o.trim()} value={o.trim()}>{o.trim()}</option>)}
                              </select>
                        ) : campo.tipo === 'numero_moneda' ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <select
                              value={(valoresCampos[campo.id] || '').split('|')[1] || 'U$S'}
                              onChange={e => {
                                const monto = (valoresCampos[campo.id] || '').split('|')[0] || ''
                                setValoresCampos(p => ({...p, [campo.id]: `${monto}|${e.target.value}`}))
                              }}
                              style={{ flex: 1, minWidth: 70 }}>
                              <option>U$S</option>
                              <option>$</option>
                              <option>€</option>
                            </select>
                            <input type="number"
                              value={(valoresCampos[campo.id] || '').split('|')[0] || ''}
                              onChange={e => {
                                const moneda = (valoresCampos[campo.id] || '').split('|')[1] || 'U$S'
                                setValoresCampos(p => ({...p, [campo.id]: `${e.target.value}|${moneda}`}))
                              }}
                              placeholder="0" style={{ flex: 3 }} />
                          </div>
                            ) : campo.tipo === 'boolean' ? (
                              <select value={valoresCampos[campo.id] || ''} onChange={e => setValoresCampos(p => ({...p, [campo.id]: e.target.value}))}
                                style={{ color: valoresCampos[campo.id] ? 'var(--navy)' : 'var(--slate)' }}>
                                <option value="">— Seleccionar —</option>
                                <option value="Sí">Sí</option>
                                <option value="No">No</option>
                              </select>
                            ) : campo.tipo === 'fecha' ? (
                              <DatePicker value={valoresCampos[campo.id] || ''} onChange={v => setValoresCampos(p => ({...p, [campo.id]: v}))} />
                            ) : (
                              <input type={campo.tipo === 'numero' ? 'number' : 'text'}
                                value={valoresCampos[campo.id] || ''}
                                onChange={e => setValoresCampos(p => ({...p, [campo.id]: e.target.value}))}
                                placeholder={campo.nombre} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                    <label>Nota <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)' }}>(opcional)</span></label>
                    <textarea value={form.nota} onChange={e => setForm({ ...form, nota: e.target.value })} placeholder="Descripción del bien asegurado" rows={2}
                      style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: 'var(--text-main)', lineHeight: 1.5 }}
                      onFocus={e => (e.target.style.borderColor = 'var(--gold)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <button className="btn-outline" onClick={() => setPaso('cliente')}>← Cambiar cliente</button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-outline" onClick={cerrarModal}>Cancelar</button>
                    <button className="btn-primary" onClick={guardarPoliza} disabled={saving || !form.numero.trim()}>
                      {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : 'Guardar póliza'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* Modal registrar pago */}
      {showPagoModal !== null && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowPagoModal(null) }}>
          <div className="pago-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Registrar pago</h3>
              <button onClick={() => setShowPagoModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              {(detalle as any)?.ramo} · {(detalle as any)?.numero} · Cuota {showPagoModal}
            </div>
            <div className="fgroup">
              <label>Fecha de pago</label>
              <DatePicker value={pagoForm.fecha} onChange={v => setPagoForm({ ...pagoForm, fecha: v })} />
            </div>
            <div className="fgroup">
              <label>Método de pago</label>
              <select value={pagoForm.metodo} onChange={e => setPagoForm({ ...pagoForm, metodo: e.target.value })}>
                {metodos.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="fgroup">
              <label>Referencia</label>
              <input value={pagoForm.referencia} onChange={e => setPagoForm({ ...pagoForm, referencia: e.target.value })} placeholder="Comprobante (opcional)" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setShowPagoModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={() => registrarPago(showPagoModal!)} disabled={savingPago}>
                {savingPago ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : 'Confirmar pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar póliza */}
      {confirmEliminar && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !eliminando) setConfirmEliminar(null) }}>
          <div className="pago-modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 4 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <AlertTriangle size={26} color="var(--danger)" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>¿Eliminar esta póliza?</h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 4 }}>
                Estás por eliminar la póliza <strong style={{ color: 'var(--text-main)' }}>{confirmEliminar.numero}</strong> ({confirmEliminar.ramo}).
              </p>
              <p style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600, marginBottom: 20 }}>
                Esta acción no se puede deshacer. Se eliminarán también sus cuotas, pagos y documentos adjuntos.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
              <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmEliminar(null)} disabled={eliminando}>
                Cancelar
              </button>
              <button
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                onClick={confirmarEliminarPoliza}
                disabled={eliminando}
              >
                {eliminando ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Eliminando...</> : <><Trash2 size={14} /> Eliminar definitivamente</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}



FILEEOF
echo '+ app/(app)/polizas/page.tsx'

cat > 'app/(app)/clientes/ClienteDetalle.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import DatePicker from '@/components/DatePicker'
import { ChevronRight, Paperclip, Phone, Mail, MessageCircle, Plus, X, Upload, Download, Trash2, Pencil, AlertTriangle } from 'lucide-react'

const FERIADOS_UY = ['01-01', '05-01', '07-18', '08-25', '12-25']
function esFeriado(date: Date): boolean {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return FERIADOS_UY.includes(`${mm}-${dd}`)
}
function siguienteDiaHabil(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  while (date.getDay() === 0 || date.getDay() === 6 || esFeriado(date)) {
    date.setDate(date.getDate() + 1)
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
function addMonthsAndDays(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const targetMonthRaw = m - 1 + months
  const targetYear = y + Math.floor(targetMonthRaw / 12)
  const targetMonth = targetMonthRaw % 12
  const maxDay = new Date(targetYear, targetMonth + 1, 0).getDate()
  const finalDay = Math.min(d, maxDay)
  const raw = `${targetYear}-${String(targetMonth + 1).padStart(2,'0')}-${String(finalDay).padStart(2,'0')}`
  return siguienteDiaHabil(raw)
}

function parseFechasCuotaMes(cuotaMes: string): string[] {
  if (!cuotaMes) return []
  const meses: Record<string,string> = { Ene:'01',Feb:'02',Mar:'03',Abr:'04',May:'05',Jun:'06',Jul:'07',Ago:'08',Sep:'09',Oct:'10',Nov:'11',Dic:'12' }
  return cuotaMes.split(' - ').map(item => {
    const parts = item.split('/')
    if (parts.length < 4) return ''
    const d = parts[1].padStart(2,'0'), m = meses[parts[2]] || '01', y = `20${parts[3]}`
    return `${y}-${m}-${d}`
  })
}

function formatValor(valor: string): string {
  if (!valor) return '—'
  if (valor.includes('|')) {
    const [monto, moneda] = valor.split('|')
    const num = Number(monto)
    if (!isNaN(num)) return `${moneda} ${num.toLocaleString('es-UY', { minimumFractionDigits: 0 })}`
  }
  return valor
}

function formatFecha(iso: string | null) {
  if (!iso) return '—'
  const [y,m,d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function fechasACuotaMes(fechas: string[]): string {
  return fechas.map((f, i) => {
    if (!f) return `${i+1}/?`
    const [y,m,d] = f.split('-')
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    return `${i+1}/${d}/${meses[parseInt(m)-1]}/${y.slice(2)}`
  }).join(' - ')
}

function ramoDot(ramo: string) {
  const map: Record<string,string> = {
    'Incendio': '#D94F4F', 'Vehículos': '#7C5CBF', 'Vida': '#2E9668',
    'RC': '#2456B0', 'Multirriesgo': '#D97706', 'Inmuebles': '#0891B2',
  }
  return map[ramo] || '#94A3B8'
}

function diasHasta(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso), hoy = new Date()
  hoy.setHours(0,0,0,0)
  return Math.round((d.getTime() - hoy.getTime()) / 86400000)
}

function estadoBadge(venc: string | null) {
  const d = diasHasta(venc)
  if (d === null) return { label: 'Sin fecha', cls: 'badge-neutral' }
  if (d < 0) return { label: 'Vencida', cls: 'badge-danger' }
  if (d <= 30) return { label: `${d}d`, cls: 'badge-danger' }
  if (d <= 90) return { label: `${d}d`, cls: 'badge-warning' }
  return { label: formatFecha(venc), cls: 'badge-success' }
}

function CampoInput({ campo, value, onChange }: {
  campo: { id: string; nombre: string; tipo: string; opciones: string | null }
  value: string
  onChange: (v: string) => void
}) {
  if (campo.tipo === 'numero_moneda') {
    const parts = value.split('|')
    const monto = parts[0] || ''
    const moneda = parts[1] || 'U$S'
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        <select value={moneda} onChange={e => onChange(`${monto}|${e.target.value}`)} style={{ flex: 1, minWidth: 70 }}>
          <option>U$S</option><option>$</option><option>€</option>
        </select>
        <input type="number" value={monto} onChange={e => onChange(`${e.target.value}|${moneda}`)} placeholder="0" style={{ flex: 3 }} />
      </div>
    )
  }
  if (campo.tipo === 'select' && campo.opciones) return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ color: value ? 'var(--navy)' : 'var(--slate)' }}>
      <option value="">— Seleccionar —</option>
      {campo.opciones.split(',').map(o => <option key={o.trim()} value={o.trim()}>{o.trim()}</option>)}
    </select>
  )
  if (campo.tipo === 'boolean') return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ color: value ? 'var(--navy)' : 'var(--slate)' }}>
      <option value="">— Seleccionar —</option>
      <option>Sí</option><option>No</option>
    </select>
  )
  if (campo.tipo === 'fecha') return <DatePicker value={value} onChange={onChange} />
  return <input type={campo.tipo === 'numero' ? 'number' : 'text'} value={value} onChange={e => onChange(e.target.value)} placeholder={campo.nombre} />
}

function CuotasFechas({ cuotas, value, onChange }: { cuotas: number; value: string[]; onChange: (v: string[]) => void }) {
  if (cuotas === 0) return (
    <div style={{ padding: '12px', background: 'var(--bg-card-alt)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
      Ingresá la cantidad de cuotas primero
    </div>
  )
  const dates = Array.from({ length: cuotas }, (_, i) => value[i] || '')
  function handleChange(idx: number, val: string) {
    const next = [...dates]; next[idx] = val
    if (idx === 0 && val) {
      for (let i = 1; i < cuotas; i++) { if (!next[i]) next[i] = addMonthsAndDays(val, i) }
    }
    onChange(next)
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto', paddingRight: 2 }}>
      {dates.map((fecha, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, background: fecha ? 'var(--navy)' : '#EEF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: fecha ? 'var(--gold)' : 'var(--slate)' }}>{i + 1}</div>
          <div style={{ flex: 1 }}>
            <DatePicker value={fecha} onChange={val => handleChange(i, val)} placeholder={i === 0 ? 'Fecha 1ª cuota (auto-completa las siguientes)' : `Fecha cuota ${i + 1}`} />
          </div>
          {i === 0 && fecha && cuotas > 1 && (
            <button onClick={() => onChange(Array.from({ length: cuotas }, (_, j) => addMonthsAndDays(fecha, j)))}
              style={{ flexShrink: 0, padding: '5px 10px', border: '1.5px solid var(--border-soft)', borderRadius: 7, background: 'var(--bg-card)', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Recalcular
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

type Poliza = {
  id: string; numero: string; ramo: string; compania: string; vencimiento: string | null
  corredor: string; moneda: string; cuotas: number; cuota_mes: string; nota: string
  poliza_campos?: { valor: string; campos_ramo: { nombre: string } }[]
  pagos?: Record<number, { fecha: string; metodo: string; referencia: string }>
  docs?: Doc[]
}

type Doc = { id: string; nombre: string; tipo: string; storage_path: string; tamanio_bytes: number }

interface Props { id: string; nombre: string; onBack: () => void }

export default function ClienteDetalle({ id, nombre, onBack }: Props) {
  const supabase = createClient()

  const [polizas, setPolizas]     = useState<Poliza[]>([])
  const [loading, setLoading]     = useState(true)
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({})
  const [catalogos, setCatalogos] = useState<{ ramos: string[]; companias: string[]; corredores: string[]; monedas: string[]; metodos: string[] }>({ ramos: [], companias: [], corredores: [], monedas: [], metodos: [] })
  const [toast, setToast]         = useState<string | null>(null)

  // Nueva póliza
  const [showPolizaModal, setShowPolizaModal] = useState(false)
  const [polizaForm, setPolizaForm]           = useState({ ramo: '', compania: '', numero: '', vencimiento: '', corredor: '', moneda: '', cuotas: '', fechasCuotas: [] as string[], nota: '' })
  const [camposRamo, setCamposRamo]           = useState<{ id: string; nombre: string; tipo: string; opciones: string | null }[]>([])
  const [valoresCampos, setValoresCampos]     = useState<Record<string, string>>({})
  const [errores, setErrores]                 = useState<Record<string, boolean>>({})
  const [savingPoliza, setSavingPoliza]       = useState(false)
  const [showNuevoCorreder, setShowNuevoCorreder] = useState(false)
  const [nuevoCorreder, setNuevoCorreder]     = useState('')

  // Editar póliza
  const [editandoPoliza, setEditandoPoliza]     = useState<Poliza | null>(null)
  const [editPolizaForm, setEditPolizaForm]     = useState<any>({})
  const [editCamposRamo, setEditCamposRamo]     = useState<{ id: string; nombre: string; tipo: string; opciones: string | null }[]>([])
  const [editValoresCampos, setEditValoresCampos] = useState<Record<string, string>>({})
  const [savingEditPoliza, setSavingEditPoliza] = useState(false)
  const [confirmEliminarPoliza, setConfirmEliminarPoliza] = useState<Poliza | null>(null)
  const [eliminandoPoliza, setEliminandoPoliza] = useState(false)
  const [editPagosCount, setEditPagosCount]     = useState(0)
  const [editFechasCuotas, setEditFechasCuotas] = useState<string[]>([])

  // Pago
  const [showPagoModal, setShowPagoModal]   = useState<{ polizaId: string; cuotaNum: number; ramo: string } | null>(null)
  const [pagoForm, setPagoForm]             = useState({ fecha: new Date().toISOString().slice(0, 10), metodo: 'Transferencia', referencia: '' })
  const [savingPago, setSavingPago]         = useState(false)

  // Docs
  const [uploadingDoc, setUploadingDoc]     = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile]         = useState<File | null>(null)
  const [tiposDoc, setTiposDoc]             = useState<string[]>([])
  const [uploadPolizaId, setUploadPolizaId] = useState<string | null>(null)
  const [uploadTipoDoc, setUploadTipoDoc]   = useState('')
  const fileRef                             = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchPolizas(); fetchCatalogos() }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  async function fetchPolizas() {
    setLoading(true)
    const { data } = await supabase.from('polizas')
      .select('*, poliza_campos(valor, campos_ramo(nombre))')
      .eq('cliente_id', id).order('created_at')
    if (data) {
      // Load pagos and docs for each poliza
      const ids = data.map((p: any) => p.id)
      const [{ data: pagosData }, { data: docsData }] = await Promise.all([
        supabase.from('pagos').select('*').in('poliza_id', ids),
        supabase.from('documentos').select('*').in('poliza_id', ids).order('created_at', { ascending: false }),
      ])
      const pagosMap: Record<string, any> = {}
      ;(pagosData || []).forEach((pg: any) => {
        if (!pagosMap[pg.poliza_id]) pagosMap[pg.poliza_id] = {}
        pagosMap[pg.poliza_id][pg.cuota_num] = pg
      })
      const docsMap: Record<string, Doc[]> = {}
      ;(docsData || []).forEach((doc: any) => {
        if (!docsMap[doc.poliza_id]) docsMap[doc.poliza_id] = []
        docsMap[doc.poliza_id].push(doc)
      })
      setPolizas(data.map((p: any) => ({ ...p, pagos: pagosMap[p.id] || {}, docs: docsMap[p.id] || [] })))
    }
    setLoading(false)
  }

  async function fetchCatalogos() {
    const [r, c, co, m, mp, td] = await Promise.all([
      supabase.from('ramos').select('nombre').order('nombre'),
      supabase.from('companias').select('nombre').order('nombre'),
      supabase.from('corredores').select('nombre').order('nombre'),
      supabase.from('monedas').select('nombre').order('nombre'),
      supabase.from('metodos_pago').select('nombre').order('nombre'),
      supabase.from('tipos_documento').select('nombre').order('nombre'),
    ])
    setCatalogos({
      ramos:     (r.data || []).map((x: any) => x.nombre),
      companias: (c.data || []).map((x: any) => x.nombre),
      corredores:(co.data || []).map((x: any) => x.nombre),
      monedas:   (m.data || []).map((x: any) => x.nombre),
      metodos:   (mp.data || []).map((x: any) => x.nombre),
    })
    setTiposDoc((td.data || []).map((x: any) => x.nombre))
    setUploadTipoDoc((td.data || [])[0]?.nombre || '')
    setPagoForm(p => ({ ...p, metodo: (mp.data || [])[0]?.nombre || 'Transferencia' }))
  }

  async function loadCamposRamo(ramo: string, polizaId?: string) {
    const { data: ramoData } = await supabase.from('ramos').select('id').eq('nombre', ramo).single()
    if (!ramoData) { setCamposRamo([]); setValoresCampos({}); return }
    const { data: campos } = await supabase.from('campos_ramo').select('*').eq('ramo_id', ramoData.id).order('orden')
    setCamposRamo(campos || [])
    if (polizaId) {
      const { data: vals } = await supabase.from('poliza_campos').select('campo_id, valor').eq('poliza_id', polizaId)
      const map: Record<string, string> = {}
      ;(vals || []).forEach((v: any) => { map[v.campo_id] = v.valor })
      setEditValoresCampos(map)
    } else {
      setValoresCampos({})
    }
  }

  async function abrirEditar(pol: Poliza) {
    setEditandoPoliza(pol)
    setEditPolizaForm({ numero: pol.numero, ramo: pol.ramo, compania: pol.compania, corredor: pol.corredor, moneda: pol.moneda, vencimiento: pol.vencimiento, nota: pol.nota || '', cuotas: pol.cuotas })
    setEditFechasCuotas(parseFechasCuotaMes(pol.cuota_mes || ''))
    // Load pagos count
    const { count } = await supabase.from('pagos').select('id', { count: 'exact', head: true }).eq('poliza_id', pol.id)
    setEditPagosCount(count || 0)
    const { data: ramoData } = await supabase.from('ramos').select('id').eq('nombre', pol.ramo).single()
    if (!ramoData) { setEditCamposRamo([]); setEditValoresCampos({}); return }
    const [{ data: campos }, { data: vals }] = await Promise.all([
      supabase.from('campos_ramo').select('*').eq('ramo_id', ramoData.id).order('orden'),
      supabase.from('poliza_campos').select('campo_id, valor').eq('poliza_id', pol.id),
    ])
    setEditCamposRamo(campos || [])
    const map: Record<string, string> = {}
    ;(vals || []).forEach((v: any) => { map[v.campo_id] = v.valor })
    setEditValoresCampos(map)
  }

  async function guardarEditPoliza() {
    if (!editandoPoliza) return
    setSavingEditPoliza(true)
    const nCuotas = Number(editPolizaForm.cuotas) || editandoPoliza.cuotas || 0
    const nuevasCuotaMes = editFechasCuotas.slice(0, nCuotas).map((f, i) => {
      if (!f) return `${i+1}/?`
      const [y,m,d] = f.split('-')
      const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
      return `${i+1}/${d}/${meses[parseInt(m)-1]}/${y.slice(2)}`
    }).join(' - ')
    await supabase.from('polizas').update({
      numero: editPolizaForm.numero, ramo: editPolizaForm.ramo,
      compania: editPolizaForm.compania, corredor: editPolizaForm.corredor,
      moneda: editPolizaForm.moneda, vencimiento: editPolizaForm.vencimiento || null,
      nota: editPolizaForm.nota || null,
      cuotas: nCuotas, cuota_mes: nuevasCuotaMes,
    }).eq('id', editandoPoliza.id)
    if (editCamposRamo.length > 0) {
      const upserts = Object.entries(editValoresCampos).filter(([_, v]) => v.trim())
        .map(([campoId, valor]) => ({ poliza_id: editandoPoliza.id, campo_id: campoId, valor }))
      if (upserts.length > 0) await supabase.from('poliza_campos').upsert(upserts, { onConflict: 'poliza_id,campo_id' })
    }
    setEditandoPoliza(null)
    setSavingEditPoliza(false)
    showToast('Póliza actualizada')
    await fetchPolizas()
  }

  async function guardarPoliza() {
    const nCuotas = parseInt(polizaForm.cuotas) || 0
    const errs: Record<string, boolean> = {}
    if (!polizaForm.numero.trim())  errs.numero = true
    if (!polizaForm.ramo)           errs.ramo = true
    if (!polizaForm.compania)       errs.compania = true
    if (!polizaForm.corredor)       errs.corredor = true
    if (!polizaForm.vencimiento)    errs.vencimiento = true
    if (nCuotas < 1)                errs.cuotas = true
    if (nCuotas > 0 && !polizaForm.fechasCuotas[0]) errs.fecha_cuota_0 = true
    if (nCuotas > 0) {
      polizaForm.fechasCuotas.slice(0, nCuotas).forEach((f, i) => { if (!f) errs[`fecha_cuota_${i}`] = true })
    }
    if (Object.keys(errs).length > 0) { setErrores(errs); showToast('Completá todos los campos obligatorios'); return }
    setErrores({})
    setSavingPoliza(true)
    const { error, data: polData } = await supabase.from('polizas').insert([{
      cliente_id: id, ramo: polizaForm.ramo, compania: polizaForm.compania,
      numero: polizaForm.numero, vencimiento: polizaForm.vencimiento || null,
      corredor: polizaForm.corredor, moneda: polizaForm.moneda, cuotas: nCuotas,
      cuota_mes: fechasACuotaMes(polizaForm.fechasCuotas), nota: polizaForm.nota || null,
    }]).select().single()
    if (!error && polData) {
      const polizaId = (polData as any).id
      if (Object.keys(valoresCampos).length > 0) {
        const inserts = Object.entries(valoresCampos).filter(([_, v]) => v.trim())
          .map(([campoId, valor]) => ({ poliza_id: polizaId, campo_id: campoId, valor }))
        if (inserts.length > 0) await supabase.from('poliza_campos').insert(inserts)
      }
      await registrarAudit({ accion: 'crear', tabla: 'polizas', registroId: polizaId, descripcion: `Póliza creada: ${polizaForm.ramo} ${polizaForm.numero} — ${nombre}`, datosDespues: polData })
      setShowPolizaModal(false)
      setCamposRamo([]); setValoresCampos({})
      setPolizaForm({ ramo: '', compania: '', numero: '', vencimiento: '', corredor: '', moneda: '', cuotas: '', fechasCuotas: [], nota: '' })
      await fetchPolizas()
    }
    setSavingPoliza(false)
  }

  async function confirmarEliminarPoliza() {
    if (!confirmEliminarPoliza) return
    const polizaId = confirmEliminarPoliza.id
    setEliminandoPoliza(true)
    const { data: polAntes } = await supabase.from('polizas').select('*').eq('id', polizaId).single()
    // Borrar documentos del storage primero
    const { data: docs } = await supabase.from('documentos').select('storage_path').eq('poliza_id', polizaId)
    if (docs && docs.length > 0) {
      await supabase.storage.from('documentos').remove(docs.map(d => d.storage_path))
    }
    // Borrar registros relacionados antes de la póliza
    await supabase.from('pagos').delete().eq('poliza_id', polizaId)
    await supabase.from('documentos').delete().eq('poliza_id', polizaId)
    await supabase.from('poliza_campos').delete().eq('poliza_id', polizaId)
    await supabase.from('siniestros').delete().eq('poliza_id', polizaId)
    const { error } = await supabase.from('polizas').delete().eq('id', polizaId)
    setEliminandoPoliza(false)
    if (error) {
      console.error('Error eliminando póliza:', error)
      showToast(`Error: ${error.message}`)
      return
    }
    setConfirmEliminarPoliza(null)
    await registrarAudit({ accion: 'eliminar', tabla: 'polizas', registroId: polizaId, descripcion: `Póliza eliminada: ${polAntes?.ramo} ${polAntes?.numero} — ${nombre}`, datosAntes: polAntes })
    await fetchPolizas()
  }

  async function registrarPago() {
    if (!showPagoModal) return
    setSavingPago(true)
    const { data: pagoData } = await supabase.from('pagos').upsert([{
      poliza_id: showPagoModal.polizaId, cuota_num: showPagoModal.cuotaNum,
      fecha: pagoForm.fecha, metodo: pagoForm.metodo, referencia: pagoForm.referencia,
    }], { onConflict: 'poliza_id,cuota_num' }).select().single()
    await registrarAudit({ accion: 'crear', tabla: 'pagos', registroId: (pagoData as any)?.id, descripcion: `Pago registrado: cuota ${showPagoModal.cuotaNum} — ${showPagoModal.ramo} — ${nombre}`, datosDespues: pagoData })
    setShowPagoModal(null)
    setSavingPago(false)
    await fetchPolizas()
  }

  async function deshacerPago(polizaId: string, cuotaNum: number) {
    if (!confirm('¿Deshacer este pago?')) return
    await supabase.from('pagos').delete().eq('poliza_id', polizaId).eq('cuota_num', cuotaNum)
    await fetchPolizas()
  }

  async function crearCorredor() {
    if (!nuevoCorreder.trim()) return
    await supabase.from('corredores').insert([{ nombre: nuevoCorreder.trim() }])
    const { data } = await supabase.from('corredores').select('nombre').order('nombre')
    setCatalogos(p => ({ ...p, corredores: (data || []).map((x: any) => x.nombre) }))
    setPolizaForm(p => ({ ...p, corredor: nuevoCorreder.trim() }))
    setShowNuevoCorreder(false); setNuevoCorreder('')
  }

  async function subirDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uploadPolizaId) return
    setUploadFile(file)
    setShowUploadModal(true)
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  async function confirmarSubida() {
    if (!uploadFile || !uploadPolizaId) return
    setUploadingDoc(uploadPolizaId)
    setShowUploadModal(false)
    const path = `${id}/${uploadPolizaId}/${Date.now()}_${uploadFile.name}`
    await supabase.storage.from('documentos').upload(path, uploadFile)
    await supabase.from('documentos').insert([{ cliente_id: id, poliza_id: uploadPolizaId, nombre: uploadFile.name, tipo: uploadTipoDoc, storage_path: path, tamanio_bytes: uploadFile.size }])
    setUploadingDoc(null); setUploadPolizaId(null); setUploadFile(null)
    await fetchPolizas(); showToast('Documento subido')
  }

  async function descargarDoc(doc: Doc) {
    const { data } = await supabase.storage.from('documentos').createSignedUrl(doc.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function eliminarDoc(doc: Doc) {
    if (!confirm(`¿Eliminar "${doc.nombre}"?`)) return
    await supabase.storage.from('documentos').remove([doc.storage_path])
    await supabase.from('documentos').delete().eq('id', doc.id)
    await fetchPolizas(); showToast('Documento eliminado')
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Clientes</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{nombre}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowPolizaModal(true)}><Plus size={15} /> Nueva póliza</button>
      </div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, padding: 0 }}>
        ← Volver a clientes
      </button>

      {/* Polizas */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{nombre}</div>
          <div style={{ background: 'var(--bg-card-alt)', borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>{polizas.length}</div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>PÓLIZAS</div>
          </div>
        </div>

        {loading ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cargando...</div>
        : polizas.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin pólizas — creá la primera arriba</div>
        : polizas.map(pol => {
          const isOpen = !!openCards[pol.id]
          const { label, cls } = estadoBadge(pol.vencimiento)
          const pagosMap: Record<number, any> = {}
          ;(pol.pagos ? Object.entries(pol.pagos) : []).forEach(([k, v]) => { pagosMap[Number(k)] = v })

          return (
            <div key={pol.id} className="poliza-card" style={{ transition: 'box-shadow .25s ease', boxShadow: isOpen ? '0 4px 20px rgba(15,30,53,.1)' : 'none' }}>
              <div className="poliza-card-header"
                onClick={() => setOpenCards(prev => ({ ...prev, [pol.id]: !prev[pol.id] }))}
                style={{ transition: 'background .15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}
              >
                <div className="ramo-dot" style={{ background: ramoDot(pol.ramo) }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="poliza-ramo">{pol.ramo}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="poliza-id">{pol.numero}</div>
                    {pol.nota && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                        {pol.nota.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                      </div>
                    )}
                  </div>
                </div>
                <span className="badge badge-neutral" style={{ flexShrink: 0 }}>{pol.compania}</span>
                <span className={`badge ${cls}`} style={{ flexShrink: 0 }}>{label}</span>
                <button className="btn-outline btn-sm" style={{ fontSize: 11, padding: '3px 8px', flexShrink: 0 }}
                  onClick={e => { e.stopPropagation(); abrirEditar(pol) }}>
                  <Pencil size={11} /> Editar
                </button>
                <ChevronRight size={16} style={{ marginLeft: 4, color: 'var(--text-muted)', transition: 'transform .28s ease', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }} />
              </div>

              <div className="poliza-card-body" style={{ display: 'grid', gridTemplateRows: isOpen ? '1fr' : '0fr', transition: 'grid-template-rows .28s ease' }}>
                <div style={{ overflow: 'hidden' }}>
                  <div className="poliza-grid">
                    <div className="poliza-field"><div className="field-label">N° Póliza</div><div className="field-val" style={{ fontFamily: 'monospace' }}>{pol.numero}</div></div>
                    <div className="poliza-field"><div className="field-label">Vencimiento</div><div className="field-val">{formatFecha(pol.vencimiento)}</div></div>
                    <div className="poliza-field"><div className="field-label">Moneda</div><div className="field-val">{pol.moneda}</div></div>
                    <div className="poliza-field"><div className="field-label">Corredor</div><div className="field-val">{pol.corredor}</div></div>
                    <div className="poliza-field"><div className="field-label">Cuotas</div><div className="field-val">{pol.cuotas || '—'}</div></div>
                  </div>

                  {pol.nota && (
                    <div style={{ background: 'var(--bg-card-alt)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, borderLeft: '3px solid var(--gold)' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Nota</div>
                      <div style={{ fontSize: 13.5, color: 'var(--text-main)' }}>{pol.nota.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</div>
                    </div>
                  )}

                  {pol.poliza_campos && pol.poliza_campos.filter(pc => pc.valor && pc.campos_ramo?.nombre).length > 0 && (
                    <div style={{ background: 'var(--bg-card-alt)', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
                        Datos específicos — {pol.ramo}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                        {pol.poliza_campos.filter(pc => pc.valor && pc.campos_ramo?.nombre).map((pc, i) => (
                          <div key={i}>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 2 }}>{pc.campos_ramo.nombre}</div>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-main)' }}>{formatValor(pc.valor)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fechas por cuota */}
                  {pol.cuota_mes && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 8 }}>Fechas de vencimiento</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px' }}>
                        {pol.cuota_mes.split(' - ').map((item, i) => {
                          const pagado = pol.pagos && (pol.pagos as any)[i+1]
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: pagado ? '#E6F5EF' : '#F4F7FB', borderRadius: 7, padding: '4px 10px', fontSize: 12.5, fontWeight: 500, color: 'var(--text-main)' }}>
                              <span style={{ fontWeight: 800, color: 'var(--text-muted)', fontSize: 11, minWidth: 14 }}>{i+1}</span>
                              <span style={{ color: 'var(--border)', fontSize: 10 }}>|</span>
                              <span>{item.split('/').slice(1).join('/')}</span>
                              {pagado && <span style={{ fontSize: 10, color: '#1A7A4E', fontWeight: 700 }}>✓</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Cuotas / Pagos */}
                  {pol.cuotas > 0 && pol.cuota_mes && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
                        Cuotas
                      </div>
                      {pol.cuota_mes.split(' - ').map((item, i) => {
                        const n = i + 1
                        const pago = pol.pagos && (pol.pagos as any)[n]
                        const fechaStr = item.split('/').slice(1).join('/')
                        return (
                          <div key={n} className={`cuota-row ${pago ? 'paid' : ''}`}>
                            <div className={`cuota-num ${pago ? 'paid' : 'pending'}`}>{n}</div>
                            <div className="cuota-info">
                              <div className="cuota-title">Cuota {n} — {fechaStr}</div>
                              <div className="cuota-sub">{pago ? `Pagado ${pago.fecha} · ${pago.metodo}` : 'Pendiente'}</div>
                            </div>
                            {pago ? (
                              <><span className="cuota-paid-tag">Pagada</span>
                              <button className="btn-outline btn-sm" style={{ fontSize: 11 }} onClick={() => deshacerPago(pol.id, n)}>Deshacer</button></>
                            ) : (
                              <button className="btn-primary btn-sm" onClick={() => { setPagoForm({ fecha: new Date().toISOString().slice(0,10), metodo: catalogos.metodos[0] || 'Transferencia', referencia: '' }); setShowPagoModal({ polizaId: pol.id, cuotaNum: n, ramo: pol.ramo }) }}>
                                + Registrar pago
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Documentos */}
                  <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    {pol.docs && pol.docs.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Documentos</div>
                        {pol.docs.map((doc: Doc) => (
                          <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F1F5FB' }}>
                            <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--bg-card-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Paperclip size={13} color="var(--slate)" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nombre}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{doc.tipo}</div>
                            </div>
                            <button className="btn-outline btn-sm" onClick={() => descargarDoc(doc)} title="Descargar"><Download size={12} /></button>
                            <button className="btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => eliminarDoc(doc)} title="Eliminar"><Trash2 size={12} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button className="btn-outline btn-sm" onClick={() => { setUploadPolizaId(pol.id); fileRef.current?.click() }} disabled={uploadingDoc === pol.id}>
                        <Upload size={13} /> {uploadingDoc === pol.id ? 'Subiendo...' : 'Subir doc'}
                      </button>
                      <button className="btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => setConfirmEliminarPoliza(pol)}>
                        <Trash2 size={13} /> Eliminar póliza
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={subirDoc} />

      {/* Modal nueva póliza */}
      {showPolizaModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) { setShowPolizaModal(false); setErrores({}); setCamposRamo([]); setValoresCampos({}) } }}>
          <div className="pago-modal" style={{ width: 540, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Nueva póliza</h3>
              <button onClick={() => { setShowPolizaModal(false); setErrores({}) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Cliente: {nombre}</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div className="fgroup">
                <label>Ramo *</label>
                <select value={polizaForm.ramo} onChange={async e => {
                  const r = e.target.value; setPolizaForm({ ...polizaForm, ramo: r }); setErrores(p => ({...p, ramo: false})); setValoresCampos({})
                  if (r) { const { data: rd } = await supabase.from('ramos').select('id').eq('nombre', r).single(); if (rd) { const { data: c } = await supabase.from('campos_ramo').select('*').eq('ramo_id', rd.id).order('orden'); setCamposRamo(c || []) } else setCamposRamo([]) } else setCamposRamo([])
                }} style={{ borderColor: errores.ramo ? 'var(--danger)' : undefined, color: polizaForm.ramo ? 'var(--navy)' : 'var(--slate)' }}>
                  <option value="">— Seleccionar —</option>
                  {catalogos.ramos.map(r => <option key={r}>{r}</option>)}
                </select>
                {errores.ramo && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>Campo obligatorio</div>}
              </div>
              <div className="fgroup">
                <label>N° Póliza *</label>
                <input value={polizaForm.numero} onChange={e => { setPolizaForm({ ...polizaForm, numero: e.target.value }); setErrores(p => ({...p, numero: false})) }} placeholder="Ej: 4309338" autoFocus style={{ borderColor: errores.numero ? 'var(--danger)' : undefined }} />
                {errores.numero && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>Campo obligatorio</div>}
              </div>
              <div className="fgroup">
                <label>Compañía *</label>
                <select value={polizaForm.compania} onChange={e => { setPolizaForm({ ...polizaForm, compania: e.target.value }); setErrores(p => ({...p, compania: false})) }} style={{ borderColor: errores.compania ? 'var(--danger)' : undefined, color: polizaForm.compania ? 'var(--navy)' : 'var(--slate)' }}>
                  <option value="">— Seleccionar —</option>
                  {catalogos.companias.map(c => <option key={c}>{c}</option>)}
                </select>
                {errores.compania && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>Campo obligatorio</div>}
              </div>
              <div className="fgroup">
                <label>Corredor *</label>
                {showNuevoCorreder ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input value={nuevoCorreder} onChange={e => setNuevoCorreder(e.target.value)} onKeyDown={e => e.key === 'Enter' && crearCorredor()} placeholder="Nombre del corredor" autoFocus style={{ flex: 1, padding: '10px 13px', border: '1.5px solid var(--gold)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                    <button className="btn-primary btn-sm" onClick={crearCorredor} style={{ padding: '8px 12px' }}>✓</button>
                    <button className="btn-outline btn-sm" onClick={() => { setShowNuevoCorreder(false); setNuevoCorreder('') }} style={{ padding: '8px 12px' }}>×</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select value={polizaForm.corredor} onChange={e => { setPolizaForm({ ...polizaForm, corredor: e.target.value }); setErrores(p => ({...p, corredor: false})) }} style={{ flex: 1, color: polizaForm.corredor ? 'var(--navy)' : 'var(--slate)', borderColor: errores.corredor ? 'var(--danger)' : undefined }}>
                      <option value="">— Seleccionar —</option>
                      {catalogos.corredores.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <button className="btn-outline btn-sm" onClick={() => setShowNuevoCorreder(true)} title="Crear corredor" style={{ padding: '8px 12px', fontSize: 16, flexShrink: 0 }}>+</button>
                  </div>
                )}
                {errores.corredor && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>Campo obligatorio</div>}
              </div>
              <div className="fgroup">
                <label>Vencimiento *</label>
                <div style={{ border: errores.vencimiento ? '1.5px solid var(--danger)' : '1.5px solid transparent', borderRadius: 9 }}>
                  <DatePicker value={polizaForm.vencimiento} onChange={v => { setPolizaForm({ ...polizaForm, vencimiento: v }); setErrores(p => ({...p, vencimiento: false})) }} placeholder="Seleccionar fecha" />
                </div>
                {errores.vencimiento && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>Campo obligatorio</div>}
              </div>
              <div className="fgroup">
                <label>Moneda *</label>
                <select value={polizaForm.moneda} onChange={e => setPolizaForm({ ...polizaForm, moneda: e.target.value })} style={{ color: polizaForm.moneda ? 'var(--navy)' : 'var(--slate)' }}>
                  <option value="">— Seleccionar —</option>
                  {catalogos.monedas.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="fgroup">
                <label>Cantidad de cuotas *</label>
                <input type="number" min="1" max="36" value={polizaForm.cuotas} onChange={e => { setPolizaForm({ ...polizaForm, cuotas: e.target.value, fechasCuotas: [] }); setErrores(p => ({...p, cuotas: false})) }} placeholder="Ej: 10" style={{ borderColor: errores.cuotas ? 'var(--danger)' : undefined }} />
                {errores.cuotas && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>Ingresá al menos 1 cuota</div>}
              </div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                <label>Fechas de vencimiento por cuota *<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>— ingresá la cantidad primero</span></label>
                {Object.keys(errores).some(k => k.startsWith('fecha_cuota')) && <div style={{ fontSize: 11, color: 'var(--danger)', marginBottom: 6 }}>Completá todas las fechas</div>}
                <CuotasFechas cuotas={parseInt(polizaForm.cuotas) || 0} value={polizaForm.fechasCuotas} onChange={v => setPolizaForm({ ...polizaForm, fechasCuotas: v })} />
              </div>

              {camposRamo.length > 0 && (
                <div style={{ gridColumn: 'span 2', background: 'var(--bg-card-alt)', borderRadius: 10, padding: 14, marginBottom: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Datos específicos de {polizaForm.ramo}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                    {camposRamo.map(campo => (
                      <div key={campo.id} className="fgroup">
                        <label>{campo.nombre}</label>
                        <CampoInput campo={campo} value={valoresCampos[campo.id] || ''} onChange={v => setValoresCampos(p => ({...p, [campo.id]: v}))} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                <label>Nota <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)' }}>(opcional)</span></label>
                <textarea value={polizaForm.nota} onChange={e => setPolizaForm({ ...polizaForm, nota: e.target.value })} placeholder="Descripción del bien asegurado" rows={2}
                  style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: 'var(--text-main)' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--gold)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => { setShowPolizaModal(false); setErrores({}) }}>Cancelar</button>
              <button className="btn-primary" onClick={guardarPoliza} disabled={savingPoliza}>
                {savingPoliza ? 'Guardando...' : 'Guardar póliza'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar póliza */}
      {editandoPoliza && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setEditandoPoliza(null) }}>
          <div className="pago-modal" style={{ width: 540, maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0 }} onClick={e => e.stopPropagation()}>
            {/* Sticky header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Editar póliza</h3>
              <button onClick={() => setEditandoPoliza(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
            </div>
            {/* Scrollable body */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div className="fgroup"><label>N° Póliza</label><input value={editPolizaForm.numero || ''} onChange={e => setEditPolizaForm((p: any) => ({...p, numero: e.target.value}))} /></div>
              <div className="fgroup"><label>Ramo</label>
                <select value={editPolizaForm.ramo || ''} onChange={async e => {
                  const nuevoRamo = e.target.value
                  setEditPolizaForm((p: any) => ({...p, ramo: nuevoRamo}))
                  setEditValoresCampos({})
                  if (nuevoRamo) {
                    const { data: rd } = await supabase.from('ramos').select('id').eq('nombre', nuevoRamo).single()
                    if (rd) {
                      const { data: campos } = await supabase.from('campos_ramo').select('*').eq('ramo_id', rd.id).order('orden')
                      setEditCamposRamo(campos || [])
                    } else setEditCamposRamo([])
                  } else setEditCamposRamo([])
                }}>
                  {catalogos.ramos.map(r => <option key={r}>{r}</option>)}
                </select></div>
              <div className="fgroup"><label>Compañía</label>
                <select value={editPolizaForm.compania || ''} onChange={e => setEditPolizaForm((p: any) => ({...p, compania: e.target.value}))}>
                  {catalogos.companias.map(c => <option key={c}>{c}</option>)}
                </select></div>
              <div className="fgroup"><label>Corredor</label>
                <select value={editPolizaForm.corredor || ''} onChange={e => setEditPolizaForm((p: any) => ({...p, corredor: e.target.value}))}>
                  {catalogos.corredores.map(c => <option key={c}>{c}</option>)}
                </select></div>
              <div className="fgroup"><label>Vencimiento</label>
                <DatePicker value={editPolizaForm.vencimiento || ''} onChange={v => setEditPolizaForm((p: any) => ({...p, vencimiento: v}))} /></div>
              <div className="fgroup"><label>Moneda</label>
                <select value={editPolizaForm.moneda || ''} onChange={e => setEditPolizaForm((p: any) => ({...p, moneda: e.target.value}))}>
                  {catalogos.monedas.map(m => <option key={m}>{m}</option>)}
                </select></div>
              <div className="fgroup">
                <label>Cantidad de cuotas</label>
                <input type="number" value={editPolizaForm.cuotas || ''} min={editPagosCount} max={36}
                  onChange={e => {
                    const n = parseInt(e.target.value) || 0
                    if (n < editPagosCount) return
                    setEditPolizaForm((p: any) => ({...p, cuotas: n}))
                    if (n > editFechasCuotas.length) {
                      const base = editFechasCuotas[0] || ''
                      setEditFechasCuotas(Array.from({ length: n }, (_, i) => editFechasCuotas[i] || (base ? addMonthsAndDays(base, i) : '')))
                    } else {
                      setEditFechasCuotas(prev => prev.slice(0, n))
                    }
                  }} />
                {editPagosCount > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                    Mínimo {editPagosCount} ({editPagosCount} ya pagada{editPagosCount > 1 ? 's' : ''})
                  </div>
                )}
              </div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Nota (opcional)</label>
                <textarea value={editPolizaForm.nota || ''} onChange={e => setEditPolizaForm((p: any) => ({...p, nota: e.target.value}))} rows={2}
                  style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: 'var(--text-main)' }} /></div>
            </div>
            {editCamposRamo.length > 0 && (
              <div style={{ background: 'var(--bg-card-alt)', borderRadius: 10, padding: 14, marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Datos específicos — {editPolizaForm.ramo}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                  {editCamposRamo.map(campo => (
                    <div key={campo.id} className="fgroup">
                      <label>{campo.nombre}</label>
                      <CampoInput campo={campo} value={editValoresCampos[campo.id] || ''} onChange={v => setEditValoresCampos(p => ({...p, [campo.id]: v}))} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {editFechasCuotas.length > 0 && (
              <div className="fgroup" style={{ marginTop: 8 }}>
                <label>Fechas de vencimiento por cuota</label>
                <CuotasFechas cuotas={Number(editPolizaForm.cuotas) || editFechasCuotas.length} value={editFechasCuotas} onChange={setEditFechasCuotas} />
              </div>
            )}
            </div>
            {/* Sticky footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 24px', borderTop: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-card)', borderRadius: '0 0 14px 14px' }}>
              <button className="btn-outline" onClick={() => setEditandoPoliza(null)}>Cancelar</button>
              <button className="btn-primary" onClick={guardarEditPoliza} disabled={savingEditPoliza}>
                {savingEditPoliza ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal registrar pago */}
      {showPagoModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowPagoModal(null) }}>
          <div className="pago-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Registrar pago</h3>
              <button onClick={() => setShowPagoModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              {showPagoModal.ramo} · Cuota {showPagoModal.cuotaNum}
            </div>
            <div className="fgroup"><label>Fecha de pago</label><DatePicker value={pagoForm.fecha} onChange={v => setPagoForm({ ...pagoForm, fecha: v })} /></div>
            <div className="fgroup"><label>Método de pago</label>
              <select value={pagoForm.metodo} onChange={e => setPagoForm({ ...pagoForm, metodo: e.target.value })}>
                {catalogos.metodos.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="fgroup"><label>Referencia</label><input value={pagoForm.referencia} onChange={e => setPagoForm({ ...pagoForm, referencia: e.target.value })} placeholder="Comprobante (opcional)" /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setShowPagoModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={registrarPago} disabled={savingPago}>
                {savingPago ? 'Guardando...' : 'Confirmar pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal subir documento */}
      {showUploadModal && uploadFile && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) { setShowUploadModal(false); setUploadFile(null) } }}>
          <div className="pago-modal" style={{ width: 460 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Subir documento</h3>
              <button onClick={() => { setShowUploadModal(false); setUploadFile(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            {/* File preview */}
            <div style={{ background: 'var(--bg-card-alt)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Paperclip size={16} color="var(--gold)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uploadFile.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{(uploadFile.size / 1024).toFixed(0)} KB</div>
              </div>
            </div>
            <div className="fgroup">
              <label>Tipo de documento</label>
              <select value={uploadTipoDoc} onChange={e => setUploadTipoDoc(e.target.value)}>
                {tiposDoc.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => { setShowUploadModal(false); setUploadFile(null) }}>Cancelar</button>
              <button className="btn-primary" onClick={confirmarSubida}>
                <Upload size={14} /> Subir archivo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar póliza */}
      {confirmEliminarPoliza && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !eliminandoPoliza) setConfirmEliminarPoliza(null) }}>
          <div className="pago-modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 4 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <AlertTriangle size={26} color="var(--danger)" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>¿Eliminar esta póliza?</h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 4 }}>
                Estás por eliminar la póliza <strong style={{ color: 'var(--text-main)' }}>{confirmEliminarPoliza.numero}</strong> ({confirmEliminarPoliza.ramo}).
              </p>
              <p style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600, marginBottom: 20 }}>
                Esta acción no se puede deshacer. Se eliminarán también sus cuotas, pagos y documentos adjuntos.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
              <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmEliminarPoliza(null)} disabled={eliminandoPoliza}>
                Cancelar
              </button>
              <button
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                onClick={confirmarEliminarPoliza}
                disabled={eliminandoPoliza}
              >
                {eliminandoPoliza ? <>Eliminando...</> : <><Trash2 size={14} /> Eliminar definitivamente</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 300, background: 'var(--navy)', color: 'white', padding: '12px 20px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,.2)', borderLeft: '3px solid var(--gold)' }}>
          {toast}
        </div>
      )}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  )
}


FILEEOF
echo '+ app/(app)/clientes/ClienteDetalle.tsx'

cat > 'app/(app)/clientes/ClientesList.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { Search, Plus, X, Loader2, Upload, CheckCircle, AlertCircle, Download, Phone, Mail, MessageCircle, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'

type Cliente = {
  id: string; nombre: string; direccion: string; contacto: string; tel: string; email: string
}
type Contacto = {
  id?: string; nombre: string; tel: string; email: string; isNew?: boolean
}

type Props = { onSelect: (id: string, nombre: string) => void }

export default function ClientesList({ onSelect }: Props) {
  const supabase = createClient()
  const csvRef   = useRef<HTMLInputElement>(null)

  const [clientes, setClientes]   = useState<Cliente[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [saving, setSaving]       = useState(false)

  // Nuevo cliente
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState({ nombre: '', direccion: '', contacto: '', tel: '', email: '' })

  // Editar cliente
  const [editando, setEditando]   = useState<Cliente | null>(null)
  const [editForm, setEditForm]   = useState({ nombre: '', direccion: '', contacto: '', tel: '', email: '' })
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [savingEdit, setSavingEdit] = useState(false)
  const [confirmEliminarCliente, setConfirmEliminarCliente] = useState<Cliente | null>(null)
  const [eliminandoCliente, setEliminandoCliente] = useState(false)

  // CSV import
  const [showImport, setShowImport]   = useState(false)
  const [csvPreview, setCsvPreview]   = useState<{rows: Omit<Cliente,'id'>[]; errors: string[]}>({ rows: [], errors: [] })
  const [importing, setImporting]     = useState(false)
  const [importDone, setImportDone]   = useState<{ok:number;skip:number} | null>(null)

  useEffect(() => { fetchClientes() }, [])

  async function fetchClientes() {
    setLoading(true)
    const { data } = await supabase.from('clientes').select('*').order('nombre')
    if (data) setClientes(data)
    setLoading(false)
  }

  async function guardar() {
    if (!form.nombre.trim()) return
    setSaving(true)
    const { error, data } = await supabase.from('clientes').insert([form]).select().single()
    if (!error && data) {
      await registrarAudit({ accion: 'crear', tabla: 'clientes', registroId: data.id, descripcion: `Cliente creado: ${form.nombre}`, datosDespues: data })
      setForm({ nombre: '', direccion: '', contacto: '', tel: '', email: '' })
      setShowModal(false)
      await fetchClientes()
    }
    setSaving(false)
  }

  async function confirmarEliminarCliente() {
    if (!confirmEliminarCliente) return
    const { id, nombre } = confirmEliminarCliente
    setEliminandoCliente(true)
    const { data } = await supabase.from('clientes').select('*').eq('id', id).single()
    await supabase.from('clientes').delete().eq('id', id)
    setEliminandoCliente(false)
    setConfirmEliminarCliente(null)
    await registrarAudit({ accion: 'eliminar', tabla: 'clientes', registroId: id, descripcion: `Cliente eliminado: ${nombre}`, datosAntes: data })
    await fetchClientes()
  }

  async function abrirEditar(c: Cliente) {
    setEditando(c)
    setEditForm({ nombre: c.nombre, direccion: c.direccion || '', contacto: c.contacto || '', tel: c.tel || '', email: c.email || '' })
    // Load extra contactos
    const { data } = await supabase.from('contactos').select('*').eq('cliente_id', c.id).order('created_at')
    setContactos(data || [])
  }

  function addContacto() {
    setContactos(prev => [...prev, { nombre: '', tel: '', email: '', isNew: true }])
  }

  function removeContacto(idx: number) {
    setContactos(prev => prev.filter((_, i) => i !== idx))
  }

  async function guardarEdicion() {
    if (!editando || !editForm.nombre.trim()) return
    setSavingEdit(true)

    // Update cliente
    await supabase.from('clientes').update({
      nombre: editForm.nombre, direccion: editForm.direccion,
      contacto: editForm.contacto, tel: editForm.tel, email: editForm.email,
    }).eq('id', editando.id)

    // Delete all old contactos and re-insert
    await supabase.from('contactos').delete().eq('cliente_id', editando.id)
    const validContactos = contactos.filter(c => c.nombre.trim())
    if (validContactos.length > 0) {
      await supabase.from('contactos').insert(
        validContactos.map(c => ({ cliente_id: editando.id, nombre: c.nombre, tel: c.tel || null, email: c.email || null }))
      )
    }

    await registrarAudit({ accion: 'editar', tabla: 'clientes', registroId: editando.id, descripcion: `Cliente editado: ${editForm.nombre}`, datosDespues: editForm })
    setEditando(null)
    setSavingEdit(false)
    await fetchClientes()
  }

  // CSV helpers (unchanged)
  function descargarPlantilla() {
    const csv = ['nombre,direccion,contacto,tel,email','Le Mans,Av. Italia 1234,Juan Pérez,099123456,juan@lemans.com.uy'].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'plantilla_clientes_fascioli.csv'; a.click()
    URL.revokeObjectURL(url)
  }
  function parseCsv(text: string) {
    const lines = text.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) return { rows: [], errors: ['El archivo está vacío'] }
    const header = lines[0].split(',').map(h => h.trim().toLowerCase())
    const idx = { nombre: header.findIndex(h => h.includes('nombre')), direccion: header.findIndex(h => h.includes('direcci')), contacto: header.findIndex(h => h.includes('contacto')), tel: header.findIndex(h => h.includes('tel')), email: header.findIndex(h => h.includes('email') || h.includes('mail')) }
    if (idx.nombre === -1) return { rows: [], errors: ['No se encontró columna "nombre"'] }
    const rows: Omit<Cliente,'id'>[] = []; const errors: string[] = []
    lines.slice(1).forEach((line, i) => {
      const cols = line.split(',').map(c => c.trim().replace(/^\"|\"$/g, ''))
      const nombre = cols[idx.nombre] || ''
      if (!nombre) { errors.push(`Fila ${i+2}: nombre vacío`); return }
      rows.push({ nombre, direccion: idx.direccion >= 0 ? cols[idx.direccion] || '' : '', contacto: idx.contacto >= 0 ? cols[idx.contacto] || '' : '', tel: idx.tel >= 0 ? cols[idx.tel] || '' : '', email: idx.email >= 0 ? cols[idx.email] || '' : '' })
    })
    return { rows, errors }
  }
  function handleCsvFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => { const result = parseCsv(e.target?.result as string); setCsvPreview(result); setShowImport(true); setImportDone(null) }
    reader.readAsText(file, 'utf-8')
  }
  async function confirmarImport() {
    if (!csvPreview.rows.length) return
    setImporting(true)
    const { data, error } = await supabase.from('clientes').insert(csvPreview.rows).select()
    let ok = 0, skip = 0
    if (error) { for (const row of csvPreview.rows) { const { error: e } = await supabase.from('clientes').insert([row]); if (e) skip++; else ok++ } }
    else { ok = data?.length || csvPreview.rows.length }
    setImporting(false); setImportDone({ ok, skip }); await fetchClientes()
  }

  const filtrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (c.direccion || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Clientes</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{clientes.length} clientes registrados</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-outline" onClick={() => { setShowImport(true); setCsvPreview({ rows: [], errors: [] }); setImportDone(null) }}>
            <Upload size={15} /> Importar CSV
          </button>
          <input ref={csvRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleCsvFile(e.target.files[0]); e.target.value = '' }} />
          <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> Nuevo cliente</button>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input placeholder="Buscar por nombre o dirección..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 340, background: 'var(--bg-card)', color: 'var(--text-main)' }} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
          <Loader2 size={28} style={{ margin: '0 auto 10px', display: 'block', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {filtrados.map(c => (
            <div key={c.id} className="edif-card" onClick={() => onSelect(c.id, c.nombre)}>
              <div className="edif-avatar">{c.nombre.trim()[0]?.toUpperCase() || '?'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="edif-name">{c.nombre}</div>
                <div className="edif-addr">{c.direccion || 'Sin dirección registrada'}</div>
                {c.contacto && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{c.contacto}</div>}
              </div>
              {/* Edit button */}
              <button title="Editar" onClick={e => { e.stopPropagation(); abrirEditar(c) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--navy)')}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--slate)')}>
                <Pencil size={14} />
              </button>
              <button className="edif-del-btn" onClick={e => { e.stopPropagation(); setConfirmEliminarCliente(c) }} title="Eliminar">
                <X size={15} />
              </button>
            </div>
          ))}
          {filtrados.length === 0 && (
            <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
              {search ? 'No se encontraron clientes' : <div><div style={{ fontWeight: 600, marginBottom: 4 }}>No hay clientes aún</div><div style={{ fontSize: 12 }}>Agregá el primero arriba</div></div>}
            </div>
          )}
        </div>
      )}

      {/* Modal nuevo cliente */}
      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="pago-modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Nuevo cliente</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                <label>Nombre del cliente *</label>
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre del edificio o cliente" autoFocus />
              </div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                <label>Dirección</label>
                <input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} placeholder="Av. Italia 7191, Montevideo" />
              </div>
              <div className="fgroup"><label>Contacto principal</label>
                <input value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} placeholder="Nombre del responsable" /></div>
              <div className="fgroup"><label>Teléfono</label>
                <input value={form.tel} onChange={e => setForm({ ...form, tel: e.target.value })} placeholder="09X XXX XXX" /></div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@cliente.com" /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={saving}>
                {saving ? <><Loader2 size={14} /> Guardando...</> : 'Guardar cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar cliente */}
      {editando && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setEditando(null) }}>
          <div className="pago-modal" style={{ width: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Editar cliente</h3>
              <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>

            {/* Datos principales */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Nombre *</label>
                <input value={editForm.nombre} onChange={e => setEditForm(p => ({...p, nombre: e.target.value}))} autoFocus /></div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Dirección</label>
                <input value={editForm.direccion} onChange={e => setEditForm(p => ({...p, direccion: e.target.value}))} placeholder="Av. Italia 7191, Montevideo" /></div>
            </div>

            {/* Contacto principal */}
            <div style={{ background: 'var(--bg-card-alt)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 10 }}>
                Contacto principal
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Nombre</label>
                  <input value={editForm.contacto} onChange={e => setEditForm(p => ({...p, contacto: e.target.value}))} placeholder="Nombre del responsable" /></div>
                <div className="fgroup"><label>Teléfono</label>
                  <input value={editForm.tel} onChange={e => setEditForm(p => ({...p, tel: e.target.value}))} placeholder="09X XXX XXX" /></div>
                <div className="fgroup"><label>Email</label>
                  <input type="email" value={editForm.email} onChange={e => setEditForm(p => ({...p, email: e.target.value}))} placeholder="admin@cliente.com" /></div>
              </div>
            </div>

            {/* Contactos adicionales */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>
                  Contactos adicionales
                </div>
                <button className="btn-outline btn-sm" onClick={addContacto} style={{ fontSize: 12 }}>
                  <Plus size={12} /> Agregar contacto
                </button>
              </div>

              {contactos.length === 0 && (
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center', padding: '12px', background: 'var(--bg-hover)', borderRadius: 8, border: '1px dashed var(--border)' }}>
                  Sin contactos adicionales — tocá "+ Agregar contacto"
                </div>
              )}

              {contactos.map((ct, idx) => (
                <div key={idx} style={{ background: 'var(--bg-card-alt)', borderRadius: 10, padding: 12, marginBottom: 8, position: 'relative' }}>
                  <button onClick={() => removeContacto(idx)}
                    style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={13} color="var(--danger)" />
                  </button>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                    <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                      <label>Nombre *</label>
                      <input value={ct.nombre} onChange={e => setContactos(prev => prev.map((c, i) => i === idx ? {...c, nombre: e.target.value} : c))} placeholder="Nombre completo" autoFocus={ct.isNew} />
                    </div>
                    <div className="fgroup">
                      <label>Teléfono</label>
                      <input value={ct.tel} onChange={e => setContactos(prev => prev.map((c, i) => i === idx ? {...c, tel: e.target.value} : c))} placeholder="09X XXX XXX" />
                    </div>
                    <div className="fgroup">
                      <label>Email</label>
                      <input type="email" value={ct.email} onChange={e => setContactos(prev => prev.map((c, i) => i === idx ? {...c, email: e.target.value} : c))} placeholder="contacto@mail.com" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn-primary" onClick={guardarEdicion} disabled={savingEdit}>
                {savingEdit ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal CSV */}
      {showImport && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) { setShowImport(false); setCsvPreview({ rows: [], errors: [] }) } }}>
          <div className="pago-modal" style={{ width: 560 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Importar clientes desde CSV</h3>
              <button onClick={() => { setShowImport(false); setCsvPreview({ rows: [], errors: [] }); setImportDone(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            {importDone ? (
              <div style={{ textAlign: 'center', padding: '28px 0' }}>
                <CheckCircle size={40} color="var(--success)" style={{ display: 'block', margin: '0 auto 12px' }} />
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>Importación completada</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}><span style={{ color: 'var(--success)', fontWeight: 700 }}>{importDone.ok} clientes importados</span>{importDone.skip > 0 && <span> · {importDone.skip} omitidos</span>}</div>
                <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => { setShowImport(false); setCsvPreview({ rows: [], errors: [] }); setImportDone(null) }}>Cerrar</button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                  <button className="btn-outline" onClick={descargarPlantilla} style={{ fontSize: 13, width: '100%', justifyContent: 'center' }}>
                    <Download size={14} /> Descargar plantilla CSV
                  </button>
                </div>
                {csvPreview.errors.length > 0 && (
                  <div style={{ background: '#FEF3C7', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                    {csvPreview.errors.map((e, i) => <div key={i} style={{ fontSize: 12.5, color: '#92400E', display: 'flex', gap: 6 }}><AlertCircle size={14} /> {e}</div>)}
                  </div>
                )}
                {csvPreview.rows.length === 0 ? (
                  <div onClick={() => csvRef.current?.click()}
                    style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '28px 24px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-hover)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--gold)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)' }}>
                    <Upload size={26} style={{ display: 'block', margin: '0 auto 10px', color: 'var(--text-muted)' }} />
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)', marginBottom: 4 }}>Seleccionar archivo CSV</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Hacé click o arrastrá tu archivo</div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', marginBottom: 10 }}>{csvPreview.rows.length} clientes a importar</div>
                    <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border-soft)', borderRadius: 10, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr style={{ background: 'var(--bg-hover)' }}>
                          {['Nombre','Dirección','Contacto','Tel','Email'].map(h => <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>)}
                        </tr></thead>
                        <tbody>{csvPreview.rows.map((r, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #F1F5FB' }}>
                            <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 600 }}>{r.nombre}</td>
                            <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text-muted)' }}>{r.direccion || '—'}</td>
                            <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text-muted)' }}>{r.contacto || '—'}</td>
                            <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text-muted)' }}>{r.tel || '—'}</td>
                            <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text-muted)' }}>{r.email || '—'}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                      <button className="btn-outline" onClick={() => csvRef.current?.click()}><Upload size={14} /> Cambiar archivo</button>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-outline" onClick={() => { setShowImport(false); setCsvPreview({ rows: [], errors: [] }) }}>Cancelar</button>
                        <button className="btn-primary" onClick={confirmarImport} disabled={importing}>
                          {importing ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Importando...</> : <>Importar {csvPreview.rows.length} clientes</>}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar cliente */}
      {confirmEliminarCliente && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !eliminandoCliente) setConfirmEliminarCliente(null) }}>
          <div className="pago-modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 4 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <AlertTriangle size={26} color="var(--danger)" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>¿Eliminar este cliente?</h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 4 }}>
                Estás por eliminar a <strong style={{ color: 'var(--text-main)' }}>{confirmEliminarCliente.nombre}</strong>.
              </p>
              <p style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600, marginBottom: 20 }}>
                Esta acción no se puede deshacer. Se eliminarán también todas sus pólizas, pagos y documentos.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
              <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmEliminarCliente(null)} disabled={eliminandoCliente}>
                Cancelar
              </button>
              <button
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                onClick={confirmarEliminarCliente}
                disabled={eliminandoCliente}
              >
                {eliminandoCliente ? 'Eliminando...' : <><Trash2 size={14} /> Eliminar definitivamente</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}


FILEEOF
echo '+ app/(app)/clientes/ClientesList.tsx'

cat > 'app/(app)/pagos/page.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Search, Download, CheckCircle, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import DatePicker from '@/components/DatePicker'
import ExportButton from '@/components/ExportButton'

const estadoColor: Record<string, string> = {
  'Cobrado':   'badge-success',
  'Pendiente': 'badge-warning',
  'Vencido':   'badge-danger',
}

// Metodos loaded from Supabase

function diasHasta(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso), hoy = new Date()
  hoy.setHours(0,0,0,0)
  return Math.round((d.getTime() - hoy.getTime()) / 86400000)
}

function formatFecha(iso: string | null) {
  if (!iso) return '—'
  const [y,m,d] = iso.split('-')
  return `${d}/${m}/${y}`
}

type Cuota = {
  poliza_id: string
  cuota_num: number
  numero_poliza: string
  ramo: string
  compania: string
  cliente_nombre: string
  vencimiento: string | null
  moneda: string
  pago_id: string | null
  pago_fecha: string | null
  pago_metodo: string | null
  pago_ref: string | null
}

export default function PagosPage() {
  const supabase = createClient()
  const [metodos, setMetodos] = useState<string[]>([])
  const [cuotas, setCuotas]     = useState<Cuota[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filtro, setFiltro]     = useState('Todos')
  const [showModal, setShowModal] = useState<Cuota | null>(null)
  const [pagoForm, setPagoForm] = useState({ fecha: new Date().toISOString().slice(0,10), metodo: 'Transferencia', referencia: '' })
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    fetchCuotas()
    supabase.from('metodos_pago').select('nombre').order('nombre')
      .then(({ data }) => { if (data) setMetodos(data.map((x:any) => x.nombre)) })
  }, [])

  async function fetchCuotas() {
    setLoading(true)
    // Traer todas las polizas con sus clientes
    const { data: polizas } = await supabase
      .from('polizas')
      .select('id, numero, ramo, compania, vencimiento, moneda, cuotas, cliente_id, clientes(nombre)')
      .order('created_at', { ascending: false })

    if (!polizas) { setLoading(false); return }

    // Traer todos los pagos
    const polizaIds = polizas.map(p => p.id)
    const { data: pagos } = await supabase
      .from('pagos')
      .select('*')
      .in('poliza_id', polizaIds)

    // Expandir cuotas
    const rows: Cuota[] = []
    for (const pol of polizas) {
      const nCuotas = pol.cuotas || 0
      if (nCuotas === 0) continue
      for (let n = 1; n <= nCuotas; n++) {
        const pago = pagos?.find(pg => pg.poliza_id === pol.id && pg.cuota_num === n)
        const d = diasHasta(pol.vencimiento)
        rows.push({
          poliza_id:       pol.id,
          cuota_num:       n,
          numero_poliza:   pol.numero,
          ramo:            pol.ramo,
          compania:        pol.compania,
          cliente_nombre:  (pol.clientes as any)?.nombre || '—',
          vencimiento:     pol.vencimiento,
          moneda:          pol.moneda,
          pago_id:         pago?.id || null,
          pago_fecha:      pago?.fecha || null,
          pago_metodo:     pago?.metodo || null,
          pago_ref:        pago?.referencia || null,
        })
      }
    }
    setCuotas(rows)
    setLoading(false)
  }

  async function cobrar() {
    if (!showModal) return
    setSaving(true)
    await supabase.from('pagos').upsert([{
      poliza_id:  showModal.poliza_id,
      cuota_num:  showModal.cuota_num,
      fecha:      pagoForm.fecha,
      metodo:     pagoForm.metodo,
      referencia: pagoForm.referencia,
    }], { onConflict: 'poliza_id,cuota_num' })
    setShowModal(null)
    setSaving(false)
    await fetchCuotas()
  }

  async function deshacer(c: Cuota) {
    await supabase.from('pagos').delete().eq('poliza_id', c.poliza_id).eq('cuota_num', c.cuota_num)
    await fetchCuotas()
  }

  const getEstado = (c: Cuota) => {
    if (c.pago_id) return 'Cobrado'
    const d = diasHasta(c.vencimiento)
    if (d !== null && d < 0) return 'Vencido'
    return 'Pendiente'
  }

  const filtradas = cuotas.filter(c => {
    const q = search.toLowerCase()
    const estado = getEstado(c)
    return (!q || c.cliente_nombre.toLowerCase().includes(q) || c.numero_poliza.toLowerCase().includes(q) || c.ramo.toLowerCase().includes(q)) &&
           (filtro === 'Todos' || estado === filtro)
  })

  const totalCobrado   = cuotas.filter(c => c.pago_id).length
  const totalPendiente = cuotas.filter(c => !c.pago_id && (diasHasta(c.vencimiento) ?? 1) >= 0).length
  const totalVencido   = cuotas.filter(c => !c.pago_id && (diasHasta(c.vencimiento) ?? 1) < 0).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Pagos</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Seguimiento de cuotas por póliza</p>
        </div>
        <ExportButton
          titulo="Reporte de cobros"
          subtitulo={`${filtradas.length} cuotas`}
          columnas={[
            { header: 'Cliente', key: 'cliente', width: 150 },
            { header: 'N° Póliza', key: 'numero', width: 80 },
            { header: 'Ramo', key: 'ramo', width: 80 },
            { header: 'Cuota', key: 'cuota', width: 40 },
            { header: 'Vencimiento', key: 'vencimiento', width: 80 },
            { header: 'Estado', key: 'estado', width: 70 },
            { header: 'Fecha de pago', key: 'fechaPago', width: 80 },
            { header: 'Método', key: 'metodo', width: 80 },
          ]}
          filas={filtradas.map(c => ({
            cliente: c.cliente_nombre,
            numero: c.numero_poliza,
            ramo: c.ramo,
            cuota: c.cuota_num,
            vencimiento: formatFecha(c.vencimiento),
            estado: getEstado(c),
            fechaPago: c.pago_fecha ? formatFecha(c.pago_fecha) : '—',
            metodo: c.pago_metodo || '—',
          }))}
          filename="reporte-cobros-fascioli"
        />
      </div>

      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Cuotas cobradas',   value: totalCobrado,   bg: '#E6F5EF', color: '#1A7A4E' },
          { label: 'Cuotas pendientes', value: totalPendiente, bg: '#FEF3C7', color: '#92400E' },
          { label: 'Cuotas vencidas',   value: totalVencido,   bg: '#FEE2E2', color: '#991B1B' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: s.color, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input placeholder="Buscar cliente, póliza o ramo..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 280, background: 'var(--bg-card)', color: 'var(--text-main)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['Todos','Cobrado','Pendiente','Vencido'].map(t =>
            <button key={t} onClick={() => setFiltro(t)} className={`filter-btn ${filtro === t ? 'active' : ''}`}>{t}</button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="table-card">
        <table>
          <colgroup>
            <col style={{ width: 180 }} /><col style={{ width: 130 }} /><col style={{ width: 110 }} />
            <col style={{ width: 110 }} /><col style={{ width: 70 }} /><col style={{ width: 120 }} />
            <col style={{ width: 120 }} /><col style={{ width: 100 }} /><col style={{ width: 100 }} />
          </colgroup>
          <thead>
            <tr>
              <th>Cliente</th><th>N° Póliza</th><th>Ramo</th><th>Compañía</th>
              <th>Cuota</th><th>Vencimiento</th><th>Cobrado</th><th>Estado</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
                Cargando pagos...
              </td></tr>
            ) : filtradas.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}></div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay cuotas registradas</div>
                <div style={{ fontSize: 12 }}>Las cuotas aparecen automáticamente cuando cargás pólizas con cuotas en Clientes</div>
              </td></tr>
            ) : filtradas.map((c, i) => {
              const estado = getEstado(c)
              return (
                <tr key={`${c.poliza_id}-${c.cuota_num}`}>
                  <td style={{ fontWeight: 600 }}>{c.cliente_nombre}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.numero_poliza}</td>
                  <td><span className="badge badge-neutral">{c.ramo}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{c.compania}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{c.cuota_num}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatFecha(c.vencimiento)}</td>
                  <td style={{ fontSize: 12 }}>{c.pago_fecha ? formatFecha(c.pago_fecha) + (c.pago_metodo ? ` · ${c.pago_metodo}` : '') : '—'}</td>
                  <td><span className={`badge ${estadoColor[estado]}`}>{estado}</span></td>
                  <td>
                    {estado !== 'Cobrado'
                      ? <button className="btn-primary btn-sm" onClick={() => { setPagoForm({ fecha: new Date().toISOString().slice(0,10), metodo: 'Transferencia', referencia: '' }); setShowModal(c) }}>
                          <CheckCircle size={12} /> Cobrar
                        </button>
                      : <button className="btn-outline btn-sm" style={{ fontSize: 11, color: 'var(--text-muted)' }} onClick={() => deshacer(c)}>Deshacer</button>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {/* Mobile card list */}
        <div className="mobile-list" style={{ display: 'none' }}>
          {filtradas.map((c, i) => {
            const estado = getEstado(c)
            return (
              <div key={`${c.poliza_id}-${c.cuota_num}`} style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5FB' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{c.cliente_nombre}</div>
                  <span className={`badge ${estadoColor[estado]}`}>{estado}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                  <span className="badge badge-neutral" style={{ marginRight: 6 }}>{c.ramo}</span>
                  <span style={{ fontFamily: 'monospace' }}>{c.numero_poliza}</span>
                  {' · '}Cuota {c.cuota_num}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {c.pago_fecha ? `Cobrado ${formatFecha(c.pago_fecha)} · ${c.pago_metodo}` : `Vence ${formatFecha(c.vencimiento)}`}
                  </div>
                  {estado !== 'Cobrado' && (
                    <button className="btn-primary btn-sm" onClick={() => { setPagoForm({ fecha: new Date().toISOString().slice(0,10), metodo: 'Transferencia', referencia: '' }); setShowModal(c) }}>
                      Cobrar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal cobrar */}
      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowModal(null) }}>
          <div className="pago-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Registrar cobro</h3>
              <button onClick={() => setShowModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              {showModal.cliente_nombre} · {showModal.ramo} · Cuota {showModal.cuota_num}
            </div>
            <div className="fgroup"><label>Fecha de cobro</label><DatePicker value={pagoForm.fecha} onChange={v => setPagoForm({ ...pagoForm, fecha: v })} /></div>
            <div className="fgroup">
              <label>Método</label>
              <select value={pagoForm.metodo} onChange={e => setPagoForm({ ...pagoForm, metodo: e.target.value })}>
                {metodos.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="fgroup"><label>Referencia</label><input value={pagoForm.referencia} onChange={e => setPagoForm({ ...pagoForm, referencia: e.target.value })} placeholder="Comprobante (opcional)" /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setShowModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={cobrar} disabled={saving}>
                {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : 'Confirmar cobro'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}


FILEEOF
echo '+ app/(app)/pagos/page.tsx'

cat > 'app/(app)/vencimientos/page.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Search, Phone, Mail, Loader2, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import ExportButton from '@/components/ExportButton'

function diasHasta(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso), hoy = new Date()
  hoy.setHours(0,0,0,0)
  return Math.round((d.getTime() - hoy.getTime()) / 86400000)
}

function formatFecha(iso: string | null) {
  if (!iso) return '—'
  const [y,m,d] = iso.split('-')
  return `${d}/${m}/${y}`
}

type Item = {
  id: string
  numero: string
  ramo: string
  compania: string
  vencimiento: string | null
  corredor: string
  moneda: string
  cliente_nombre: string
  cliente_tel: string
  cliente_email: string
  dias: number | null
}

export default function VencimientosPage() {
  const supabase = createClient()
  const [items, setItems]     = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filtro, setFiltro]   = useState(90)

  useEffect(() => { fetchVencimientos() }, [])

  async function fetchVencimientos() {
    setLoading(true)
    const { data } = await supabase
      .from('polizas')
      .select('id, numero, ramo, compania, vencimiento, corredor, moneda, clientes(nombre, tel, email)')
      .order('vencimiento', { ascending: true })

    if (data) {
      setItems(data.map(p => ({
        id:              p.id,
        numero:          p.numero,
        ramo:            p.ramo,
        compania:        p.compania,
        vencimiento:     p.vencimiento,
        corredor:        p.corredor,
        moneda:          p.moneda,
        cliente_nombre:  (p.clientes as any)?.nombre || '—',
        cliente_tel:     (p.clientes as any)?.tel || '',
        cliente_email:   (p.clientes as any)?.email || '',
        dias:            diasHasta(p.vencimiento),
      })))
    }
    setLoading(false)
  }

  const filtrados = items.filter(v => {
    const q = search.toLowerCase()
    const matchQ = !q || v.cliente_nombre.toLowerCase().includes(q) || v.numero.toLowerCase().includes(q)
    if (filtro === 0)  return matchQ && v.dias !== null && v.dias < 0
    if (filtro === -1) return matchQ
    return matchQ && v.dias !== null && v.dias >= 0 && v.dias <= filtro
  })

  const urgentes   = filtrados.filter(v => v.dias !== null && v.dias >= 0 && v.dias <= 7)
  const proximos   = filtrados.filter(v => v.dias !== null && v.dias > 7 && v.dias <= 30)
  const planificados = filtrados.filter(v => v.dias !== null && v.dias > 30)
  const vencidas   = filtrados.filter(v => v.dias !== null && v.dias < 0)

  function Section({ title, items, dotColor }: { title: string; items: Item[]; dotColor: string }) {
    if (items.length === 0) return null
    return (
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>{title}</h2>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card-alt)', padding: '2px 8px', borderRadius: 10 }}>{items.length}</span>
        </div>
        {items.map(v => (
          <div key={v.id} style={{
            background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)',
            padding: '16px 18px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 14,
            borderLeft: `3px solid ${dotColor}`
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 10, flexShrink: 0,
              background: v.dias !== null && v.dias < 0 ? '#FEE2E2' : v.dias !== null && v.dias <= 7 ? '#FEE2E2' : v.dias !== null && v.dias <= 30 ? '#FEF3C7' : '#EEF2F8',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1, color: v.dias !== null && v.dias < 0 ? '#991B1B' : v.dias !== null && v.dias <= 7 ? '#991B1B' : v.dias !== null && v.dias <= 30 ? '#92400E' : 'var(--navy)' }}>
                {v.dias !== null ? Math.abs(v.dias) : '?'}
              </span>
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', opacity: .7, color: 'var(--text-muted)' }}>
                {v.dias !== null && v.dias < 0 ? 'venc.' : 'días'}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{v.cliente_nombre}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge badge-neutral">{v.ramo}</span>
                <span style={{ fontFamily: 'monospace' }}>{v.numero}</span>
                <span>{v.compania}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Vence</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{formatFecha(v.vencimiento)}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                {v.cliente_tel && <a href={`tel:${v.cliente_tel}`} className="btn-outline btn-sm" style={{ textDecoration: 'none', fontSize: 11 }}><Phone size={12} /></a>}
                {v.cliente_email && <a href={`mailto:${v.cliente_email}`} className="btn-outline btn-sm" style={{ textDecoration: 'none', fontSize: 11 }}><Mail size={12} /></a>}
                {v.cliente_tel && <a href={`https://wa.me/${v.cliente_tel.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="btn-outline btn-sm" style={{ textDecoration: 'none', fontSize: 11, color: '#25D366', borderColor: '#25D366' }}><MessageCircle size={12} /></a>}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Vencimientos</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Pólizas ordenadas por proximidad de vencimiento</p>
        </div>
        <ExportButton
          titulo="Vencimientos de pólizas"
          subtitulo={`${filtrados.length} pólizas`}
          columnas={[
            { header: 'Cliente', key: 'cliente', width: 150 },
            { header: 'N° Póliza', key: 'numero', width: 80 },
            { header: 'Ramo', key: 'ramo', width: 80 },
            { header: 'Compañía', key: 'compania', width: 80 },
            { header: 'Vencimiento', key: 'vencimiento', width: 80 },
            { header: 'Días', key: 'dias', width: 50 },
            { header: 'Teléfono', key: 'telefono', width: 90 },
          ]}
          filas={filtrados.map(v => ({
            cliente: v.cliente_nombre,
            numero: v.numero,
            ramo: v.ramo,
            compania: v.compania,
            vencimiento: formatFecha(v.vencimiento),
            dias: v.dias !== null ? (v.dias < 0 ? `Vencida (${Math.abs(v.dias)}d)` : `${v.dias}d`) : '—',
            telefono: v.cliente_tel,
          }))}
          filename="vencimientos-fascioli"
        />
      </div>

      {/* Resumen */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Vencidas',    count: vencidas.length,    bg: '#FEE2E2', color: '#991B1B' },
          { label: '≤ 7 días',   count: urgentes.length,    bg: '#FEE2E2', color: '#991B1B' },
          { label: '8–30 días',  count: proximos.length,    bg: '#FEF3C7', color: '#92400E' },
          { label: '31–90 días', count: planificados.length, bg: '#EEF2F8', color: 'var(--text-main)' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '10px 18px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: 11, color: s.color, opacity: .8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input placeholder="Buscar cliente o N° póliza..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 280, background: 'var(--bg-card)', color: 'var(--text-main)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[{l:'30 días',v:30},{l:'90 días',v:90},{l:'180 días',v:180},{l:'Vencidas',v:0},{l:'Todas',v:-1}].map(t =>
            <button key={t.v} onClick={() => setFiltro(t.v)} className={`filter-btn ${filtro === t.v ? 'active' : ''}`}>{t.l}</button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Cargando vencimientos...
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}></div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Sin vencimientos en este rango</div>
          <div style={{ fontSize: 12 }}>Probá cambiando el filtro o agregando pólizas con fecha de vencimiento</div>
        </div>
      ) : (
        <>
          <Section title="Vencidas" items={vencidas} dotColor="#D94F4F" />
          <Section title="Urgentes — vencen en 7 días o menos" items={urgentes} dotColor="#D94F4F" />
          <Section title="Próximas — 8 a 30 días" items={proximos} dotColor="#D97706" />
          <Section title="Planificadas — 31 a 90 días" items={planificados} dotColor="#4A80D4" />
        </>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}


FILEEOF
echo '+ app/(app)/vencimientos/page.tsx'

cat > 'app/(app)/dashboard/page.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { Bell, AlertTriangle, FileText, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase'

function diasHasta(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso), hoy = new Date()
  hoy.setHours(0,0,0,0)
  return Math.round((d.getTime() - hoy.getTime()) / 86400000)
}

export default function DashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState({ venc30: 0, venc7: 0, siniestros: 0 })
  const [loading, setLoading] = useState(true)
  const [vencProximas, setVencProximas] = useState<any[]>([])

  useEffect(() => { fetchStats() }, [])

  async function fetchStats() {
    const [{ data: polizasData }, { count: siniestros }] = await Promise.all([
      supabase.from('polizas').select('id, numero, ramo, vencimiento, clientes(nombre)'),
      supabase.from('siniestros').select('*', { count: 'exact', head: true }).neq('estado', 'Cerrado'),
    ])
    const venc30 = (polizasData || []).filter(p => { const d = diasHasta(p.vencimiento); return d !== null && d >= 0 && d <= 30 }).length
    const proximas = (polizasData || [])
      .filter(p => { const d = diasHasta(p.vencimiento); return d !== null && d >= 0 && d <= 90 })
      .sort((a, b) => (diasHasta(a.vencimiento) || 0) - (diasHasta(b.vencimiento) || 0))
      .slice(0, 6)
    const venc7 = (polizasData || []).filter(p => { const d = diasHasta(p.vencimiento); return d !== null && d >= 0 && d <= 7 }).length
    setStats({ venc30, venc7, siniestros: siniestros || 0 })
    setVencProximas(proximas)
    setLoading(false)
  }

  function formatFecha(iso: string | null) {
    if (!iso) return '—'
    const [y,m,d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  const statCards: { label: string; value: any; sub: string; icon: any; bg: string; iconColor: string; href?: string }[] = [
    { label: 'Vencen en 30 días',   value: loading ? '—' : stats.venc30,     sub: 'Ver vencimientos →', icon: Bell,          bg: '#FEF3C7', iconColor: '#D97706', href: '/vencimientos' },
    { label: 'Siniestros abiertos', value: loading ? '—' : stats.siniestros, sub: 'En gestión',         icon: AlertTriangle, bg: '#FEE2E2', iconColor: '#D94F4F', href: '/siniestros' },
  ]

  return (
    <div>
      {/* Banner urgente */}
      {!loading && stats.venc7 > 0 && (
        <a href="/vencimientos" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, background: '#FEF2F2', border: '1.5px solid #FCA5A5', borderRadius: 12, padding: '13px 18px', marginBottom: 16, cursor: 'pointer', transition: 'background .15s' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#FEE2E2')}
          onMouseLeave={e => (e.currentTarget.style.background = '#FEF2F2')}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bell size={18} color="#D94F4F" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#991B1B' }}>
              {stats.venc7 === 1 ? '1 póliza vence' : `${stats.venc7} pólizas vencen`} en los próximos 7 días
            </div>
            <div style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
              Tocá para ver los vencimientos urgentes →
            </div>
          </div>
        </a>
      )}

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
          {new Date().toLocaleDateString('es-UY', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats — CSS class handles responsive */}
      <div className="dashboard-stats" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
        {statCards.map(s => (
          s.href ? (
            <a key={s.label} href={s.href} className="stat-card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
              <div className="stat-card-inner">
                <div className="stat-card-text">
                  <div className="label">{s.label}</div>
                  <div className="value">{s.value}</div>
                  <div className="sub">{s.sub}</div>
                </div>
                <div className="stat-card-icon" style={{ background: s.bg }}>
                  <s.icon size={20} color={s.iconColor} />
                </div>
              </div>
            </a>
          ) : (
            <div key={s.label} className="stat-card">
              <div className="stat-card-inner">
                <div className="stat-card-text">
                  <div className="label">{s.label}</div>
                  <div className="value">{s.value}</div>
                  <div className="sub">{s.sub}</div>
                </div>
                <div className="stat-card-icon" style={{ background: s.bg }}>
                  <s.icon size={20} color={s.iconColor} />
                </div>
              </div>
            </div>
          )
        ))}
      </div>

      {/* Panels — CSS class handles responsive */}
      <div className="dashboard-panels">
        {/* Próximos vencimientos */}
        <div className="dashboard-panel">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Próximos vencimientos</div>
          {loading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cargando...</div>
          ) : vencProximas.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No hay vencimientos próximos</div>
          ) : vencProximas.map(p => {
            const d = diasHasta(p.vencimiento)
            const cls = d !== null && d <= 7 ? 'badge-danger' : d !== null && d <= 30 ? 'badge-warning' : 'badge-success'
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #F1F5FB', overflow: 'hidden' }}>
                <span className="badge badge-neutral" style={{ flexShrink: 0 }}>{p.ramo}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(p.clientes as any)?.nombre}</span>
                <span className={`badge ${cls}`} style={{ flexShrink: 0 }}>{d}d</span>
              </div>
            )
          })}
          {vencProximas.length > 0 && (
            <a href="/vencimientos" style={{ display: 'block', marginTop: 12, fontSize: 12, color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}>Ver todos →</a>
          )}
        </div>

        {/* Accesos rápidos */}
        <div className="dashboard-panel">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Accesos rápidos</div>
          {[
            { href: '/clientes',     Icon: Users,         label: 'Nuevo cliente',    sub: 'Agregar un cliente a la cartera' },
            { href: '/polizas',      Icon: FileText,      label: 'Nueva póliza',     sub: 'Cargar una póliza existente' },
            { href: '/vencimientos', Icon: Bell,          label: 'Ver vencimientos', sub: 'Pólizas próximas a vencer' },
            { href: '/siniestros',   Icon: AlertTriangle, label: 'Nuevo siniestro',  sub: 'Registrar un siniestro' },
          ].map(({ href, Icon, label, sub }) => (
            <a key={href} href={href} className="acceso-rapido">
              <div className="acceso-rapido-icon">
                <Icon size={17} color="var(--navy)" />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-main)' }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}


FILEEOF
echo '+ app/(app)/dashboard/page.tsx'

cat > 'app/(app)/configuracion/page.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type Item = { id: string; nombre: string }
type Tabla = 'companias' | 'ramos' | 'corredores' | 'metodos_pago' | 'tipos_siniestro' | 'tipos_documento' | 'monedas'
type CampoRamo = { id: string; nombre: string; tipo: string; opciones: string | null; orden: number }

const SECCIONES: { tabla: Tabla; titulo: string; abrev: string; placeholder: string }[] = [
  { tabla: 'companias',       titulo: 'Compañías aseguradoras',   abrev: 'CIA', placeholder: 'Ej: BSE, SURA, Mapfre...' },
  { tabla: 'ramos',           titulo: 'Ramos / Tipos de seguro',  abrev: 'RAM', placeholder: 'Ej: Incendio, RC...' },
  { tabla: 'corredores',      titulo: 'Corredores',               abrev: 'COR', placeholder: 'Ej: Fascioli...' },
  { tabla: 'metodos_pago',    titulo: 'Métodos de pago',          abrev: 'PAG', placeholder: 'Ej: Transferencia...' },
  { tabla: 'tipos_siniestro', titulo: 'Tipos de siniestro',       abrev: 'SIN', placeholder: 'Ej: Choque, Robo...' },
  { tabla: 'tipos_documento', titulo: 'Tipos de documento',       abrev: 'DOC', placeholder: 'Ej: Póliza, Endoso...' },
  { tabla: 'monedas',         titulo: 'Monedas',                  abrev: 'MON', placeholder: 'Ej: U$S, $, €...' },
]

const TIPOS_CAMPO = [
  { value: 'texto',   label: 'Texto libre' },
  { value: 'numero',  label: 'Número' },
  { value: 'select',  label: 'Lista de opciones' },
  { value: 'fecha',   label: 'Fecha' },
  { value: 'boolean', label: 'Sí / No' },
]

function Seccion({ tabla, titulo, abrev, placeholder }: typeof SECCIONES[0]) {
  const supabase = createClient()
  const [items, setItems]     = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevo, setNuevo]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState<string | null>(null)

  useEffect(() => { fetch() }, [])
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  async function fetch() {
    setLoading(true)
    const { data } = await supabase.from(tabla).select('id, nombre').order('nombre')
    if (data) setItems(data)
    setLoading(false)
  }

  async function agregar() {
    const nombre = nuevo.trim()
    if (!nombre) return
    setSaving(true)
    const { error } = await supabase.from(tabla).insert([{ nombre }])
    if (error) showToast(`❌ ${error.message.includes('unique') ? 'Ya existe ese nombre' : error.message}`)
    else { setNuevo(''); showToast(`✓ "${nombre}" agregado`); await fetch() }
    setSaving(false)
  }

  async function eliminar(item: Item) {
    if (!confirm(`¿Eliminar "${item.nombre}"?`)) return
    const { error } = await supabase.from(tabla).delete().eq('id', item.id)
    if (error) showToast('❌ No se pudo eliminar — puede estar en uso')
    else { showToast(`"${item.nombre}" eliminado`); await fetch() }
  }

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', background: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 7, background: 'rgba(201,168,76,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold)', letterSpacing: '.04em' }}>{abrev}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>{titulo}</div>
          <div style={{ fontSize: 11, color: 'var(--slate-light)', marginTop: 1 }}>{loading ? '...' : `${items.length} registros`}</div>
        </div>
      </div>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <input value={nuevo} onChange={e => setNuevo(e.target.value)} onKeyDown={e => e.key === 'Enter' && agregar()}
          placeholder={placeholder}
          style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', color: 'var(--text-main)', transition: 'border-color .14s' }}
          onFocus={e => (e.target.style.borderColor = 'var(--gold)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
        <button className="btn-primary" onClick={agregar} disabled={saving || !nuevo.trim()} style={{ padding: '8px 14px', fontSize: 13 }}>
          {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
        </button>
      </div>
      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={18} style={{ display: 'block', margin: '0 auto 6px', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Sin registros — agregá el primero arriba</div>
        ) : items.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #F1F5FB' }}>
            <span style={{ flex: 1, fontSize: 14, color: 'var(--text-main)' }}>{item.nombre}</span>
            <button onClick={() => eliminar(item)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: 6, display: 'flex', alignItems: 'center', transition: 'color .12s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--slate)')}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      {toast && (
        <div style={{ padding: '10px 16px', background: toast.startsWith('❌') ? '#FEE2E2' : '#E6F5EF', borderTop: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: toast.startsWith('❌') ? '#991B1B' : '#1A7A4E' }}>
          {toast}
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Campos por ramo ──────────────────────────────────────────────────────────
function CamposRamo() {
  const supabase = createClient()
  const [ramos, setRamos]         = useState<Item[]>([])
  const [ramoSel, setRamoSel]     = useState<Item | null>(null)
  const [campos, setCampos]       = useState<CampoRamo[]>([])
  const [loading, setLoading]     = useState(false)
  const [showForm, setShowForm]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState<string | null>(null)
  const [form, setForm]           = useState({ nombre: '', tipo: 'texto', opciones: '', con_moneda: false })

  useEffect(() => {
    supabase.from('ramos').select('id, nombre').order('nombre').then(({ data }) => { if (data) setRamos(data) })
  }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  async function seleccionarRamo(ramo: Item) {
    setRamoSel(ramo); setLoading(true); setShowForm(false)
    const { data } = await supabase.from('campos_ramo').select('*').eq('ramo_id', ramo.id).order('orden')
    setCampos(data || [])
    setLoading(false)
  }

  async function agregarCampo() {
    if (!ramoSel || !form.nombre.trim()) return
    setSaving(true)
    // For numeric fields with moneda, save as "numero_moneda" type and store options as monedas
    const tipoFinal = form.tipo === 'numero' && form.con_moneda ? 'numero_moneda' : form.tipo
    await supabase.from('campos_ramo').insert([{
      ramo_id: ramoSel.id,
      nombre:  form.nombre.trim(),
      tipo:    tipoFinal,
      opciones: form.tipo === 'select' ? form.opciones : null,
      orden:   campos.length,
    }])
    setForm({ nombre: '', tipo: 'texto', opciones: '', con_moneda: false })
    setShowForm(false)
    await seleccionarRamo(ramoSel)
    showToast(`Campo "${form.nombre}" agregado`)
    setSaving(false)
  }

  async function eliminarCampo(campo: CampoRamo) {
    if (!confirm(`¿Eliminar el campo "${campo.nombre}"? Se perderán los datos existentes.`)) return
    await supabase.from('campos_ramo').delete().eq('id', campo.id)
    if (ramoSel) await seleccionarRamo(ramoSel)
    showToast(`Campo "${campo.nombre}" eliminado`)
  }

  const tipoLabel: Record<string, string> = { texto: 'Texto', numero: 'Número', numero_moneda: 'Número + Moneda', select: 'Lista', fecha: 'Fecha', boolean: 'Sí/No' }

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', overflow: 'hidden', gridColumn: 'span 2' }}>
      <div style={{ padding: '14px 18px', background: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 7, background: 'rgba(201,168,76,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold)' }}>CAM</span>
        </div>
        <div>
          <div style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>Campos adicionales por ramo</div>
          <div style={{ fontSize: 11, color: 'var(--slate-light)', marginTop: 1 }}>Definí campos específicos para cada tipo de seguro</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: 200 }}>
        {/* Ramos list */}
        <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto' }}>
          {ramos.map(r => (
            <div key={r.id} onClick={() => seleccionarRamo(r)}
              style={{ padding: '11px 16px', cursor: 'pointer', borderBottom: '1px solid #F1F5FB', fontSize: 13.5, fontWeight: ramoSel?.id === r.id ? 700 : 400, color: 'var(--text-main)', background: ramoSel?.id === r.id ? 'var(--gold-pale)' : 'white', borderLeft: ramoSel?.id === r.id ? '3px solid var(--gold)' : '3px solid transparent', transition: 'all .12s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {r.nombre}
              <ChevronRight size={14} color="var(--slate)" />
            </div>
          ))}
        </div>

        {/* Campos del ramo seleccionado */}
        <div style={{ padding: '16px' }}>
          {!ramoSel ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: 13 }}>
              Seleccioná un ramo para ver o agregar campos
            </div>
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
              <Loader2 size={18} style={{ display: 'block', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
                  {ramoSel.nombre} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>— {campos.length} campos</span>
                </div>
                <button className="btn-primary btn-sm" onClick={() => setShowForm(s => !s)}>
                  <Plus size={13} /> Agregar campo
                </button>
              </div>

              {/* Form nuevo campo */}
              {showForm && (
                <div style={{ background: 'var(--bg-card-alt)', borderRadius: 10, padding: '14px', marginBottom: 14, border: '1px solid var(--border-soft)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                    <div className="fgroup">
                      <label>Nombre del campo *</label>
                      <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Suma asegurada" autoFocus />
                    </div>
                    <div className="fgroup">
                      <label>Tipo de campo</label>
                      <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                        {TIPOS_CAMPO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    {form.tipo === 'select' && (
                      <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                        <label>Opciones (separadas por coma)</label>
                        <input value={form.opciones} onChange={e => setForm({ ...form, opciones: e.target.value })} placeholder="Ej: Global, 3x2, Solo terceros" />
                      </div>
                    )}
                    {form.tipo === 'numero' && (
                      <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textTransform: 'none', letterSpacing: 0, fontSize: 13 }}>
                          <input type="checkbox" checked={form.con_moneda} onChange={e => setForm({ ...form, con_moneda: e.target.checked })}
                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--gold)' }} />
                          Incluir selector de moneda (ej: suma asegurada en U$S o $)
                        </label>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                    <button className="btn-outline btn-sm" onClick={() => setShowForm(false)}>Cancelar</button>
                    <button className="btn-primary btn-sm" onClick={agregarCampo} disabled={saving || !form.nombre.trim()}>
                      {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : 'Guardar campo'}
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de campos */}
              {campos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: 13, background: 'var(--bg-hover)', borderRadius: 8 }}>
                  Sin campos adicionales para {ramoSel.nombre}
                </div>
              ) : campos.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-soft)', marginBottom: 6, background: 'var(--bg-card)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-main)' }}>{c.nombre}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {tipoLabel[c.tipo] || c.tipo}
                      {c.opciones && ` · ${c.opciones}`}
                    </div>
                  </div>
                  <button onClick={() => eliminarCampo(c)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--slate)')}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {toast && (
        <div style={{ padding: '10px 16px', background: '#E6F5EF', borderTop: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: '#1A7A4E' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

export default function ConfiguracionPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Configuración</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Administrá todos los catálogos del sistema</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
        {SECCIONES.map(s => <Seccion key={s.tabla} {...s} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <CamposRamo />
      </div>
    </div>
  )
}


FILEEOF
echo '+ app/(app)/configuracion/page.tsx'

cat > 'app/(app)/documentos/page.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { Upload, Download, Trash2, Search, Loader2, X, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'


const extStyle: Record<string, { bg: string; color: string; label: string }> = {
  pdf:  { bg: '#FEE2E2', color: '#991B1B', label: 'PDF' },
  jpg:  { bg: '#DBEAFE', color: '#1E40AF', label: 'IMG' },
  jpeg: { bg: '#DBEAFE', color: '#1E40AF', label: 'IMG' },
  png:  { bg: '#DBEAFE', color: '#1E40AF', label: 'IMG' },
  docx: { bg: '#FEF3C7', color: '#92400E', label: 'DOC' },
  doc:  { bg: '#FEF3C7', color: '#92400E', label: 'DOC' },
  xlsx: { bg: '#E6F5EF', color: '#1A7A4E', label: 'XLS' },
  xls:  { bg: '#E6F5EF', color: '#1A7A4E', label: 'XLS' },
}

function getExt(nombre: string) { return nombre.split('.').pop()?.toLowerCase() || 'pdf' }
function formatBytes(b: number) {
  if (!b) return '—'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}
function formatFecha(iso: string) {
  const [y,m,d] = iso.slice(0,10).split('-'); return `${d}/${m}/${y}`
}

type Documento = {
  id: string; nombre: string; tipo: string; storage_path: string
  tamanio_bytes: number; created_at: string
  clientes: { nombre: string } | null
  polizas: { numero: string; ramo: string } | null
}
type Cliente = { id: string; nombre: string; direccion: string }
type Poliza  = { id: string; numero: string; ramo: string; compania: string }
type Paso    = 'cliente' | 'poliza' | 'archivo'

export default function DocumentosPage() {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)

  const [tiposDoc, setTiposDoc]     = useState<string[]>([])
  const [docs, setDocs]             = useState<Documento[]>([])
  const [clientes, setClientes]     = useState<Cliente[]>([])
  const [polizasCliente, setPolizasCliente] = useState<Poliza[]>([])
  const [loading, setLoading]       = useState(true)
  const [uploading, setUploading]   = useState(false)
  const [drag, setDrag]             = useState(false)
  const [search, setSearch]         = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')

  // Modal upload (3 pasos)
  const [showModal, setShowModal]   = useState(false)
  const [paso, setPaso]             = useState<Paso>('cliente')
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null)
  const [polizaSel, setPolizaSel]   = useState<Poliza | null>(null)
  const [fileSel, setFileSel]       = useState<File | null>(null)
  const [tipoDoc, setTipoDoc]       = useState('Póliza')

  useEffect(() => {
    fetchDocs()
    fetchClientes()
    supabase.from('tipos_documento').select('nombre').order('nombre')
      .then(({ data }) => { if (data) setTiposDoc(data.map((x: any) => x.nombre)) })
  }, [])

  async function fetchDocs() {
    setLoading(true)
    const { data } = await supabase
      .from('documentos')
      .select('*, clientes(nombre), polizas(numero, ramo)')
      .order('created_at', { ascending: false })
    if (data) setDocs(data)
    setLoading(false)
  }

  async function fetchClientes() {
    const { data } = await supabase.from('clientes').select('id, nombre, direccion').order('nombre')
    if (data) setClientes(data)
  }

  async function fetchPolizasCliente(clienteId: string) {
    const { data } = await supabase
      .from('polizas').select('id, numero, ramo, compania')
      .eq('cliente_id', clienteId).order('ramo')
    setPolizasCliente(data || [])
  }

  function abrirModal() {
    setPaso('cliente'); setClienteSearch(''); setClienteSel(null)
    setPolizaSel(null); setFileSel(null); setTipoDoc('Póliza')
    setPolizasCliente([])
    setShowModal(true)
  }

  function cerrarModal() { setShowModal(false) }

  // Cuando el usuario elige un archivo en el paso 3
  function onFileChange(files: FileList | null) {
    if (!files || files.length === 0) return
    setFileSel(files[0])
  }

  async function confirmarSubida() {
    if (!clienteSel || !polizaSel || !fileSel) return
    setUploading(true)
    cerrarModal()

    const path = `${clienteSel.id}/${polizaSel.id}/${Date.now()}_${fileSel.name.replace(/\s/g, '_')}`

    const { error: storageErr } = await supabase.storage
      .from('documentos')
      .upload(path, fileSel, { upsert: false })

    if (storageErr) {
      alert(`Error al subir: ${storageErr.message}`)
      setUploading(false)
      return
    }

    await supabase.from('documentos').insert([{
      nombre:        fileSel.name,
      tipo:          tipoDoc,
      storage_path:  path,
      tamanio_bytes: fileSel.size,
      cliente_id:    clienteSel.id,
      poliza_id:     polizaSel.id,
    }])

    setUploading(false)
    setFileSel(null)
    await fetchDocs()
  }

  // Drag & drop en la zona principal también abre el modal
  function handleDrop(files: FileList | null) {
    if (!files || files.length === 0) return
    setFileSel(files[0])
    abrirModal()
  }

  async function descargar(doc: Documento) {
    const { data } = await supabase.storage.from('documentos').createSignedUrl(doc.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function eliminar(doc: Documento) {
    if (!confirm(`¿Eliminar "${doc.nombre}"?`)) return
    await supabase.storage.from('documentos').remove([doc.storage_path])
    await supabase.from('documentos').delete().eq('id', doc.id)
    await fetchDocs()
  }

  const filtrados = docs.filter(d => {
    const q = search.toLowerCase()
    return (!q || d.nombre.toLowerCase().includes(q) || (d.clientes?.nombre || '').toLowerCase().includes(q)) &&
           (filtroTipo === 'Todos' || d.tipo === filtroTipo)
  })

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    (c.direccion || '').toLowerCase().includes(clienteSearch.toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Documentos</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Archivo centralizado de pólizas, endosos y expedientes</p>
        </div>
        <button className="btn-primary" onClick={abrirModal} disabled={uploading}>
          {uploading
            ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Subiendo...</>
            : <><Upload size={14} /> Subir archivo</>}
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); handleDrop(e.dataTransfer.files) }}
        onClick={abrirModal}
        style={{
          border: `2px dashed ${drag ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 12,
          padding: '28px 24px', textAlign: 'center', marginBottom: 24,
          background: drag ? 'var(--gold-pale)' : '#FAFBFC', transition: 'all .2s', cursor: 'pointer'
        }}
      >
        {uploading
          ? <><Loader2 size={24} style={{ margin: '0 auto 8px', color: 'var(--gold)', display: 'block', animation: 'spin 1s linear infinite' }} />
              <div style={{ fontWeight: 600, color: 'var(--gold)', fontSize: 14 }}>Subiendo archivo...</div></>
          : <><Upload size={24} style={{ margin: '0 auto 8px', color: drag ? 'var(--gold)' : 'var(--slate)', display: 'block' }} />
              <div style={{ fontWeight: 600, color: drag ? 'var(--gold)' : 'var(--navy)', fontSize: 14 }}>
                {drag ? 'Soltá el archivo' : 'Arrastrá un archivo acá'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>PDF, JPG, PNG, Word, Excel · Se asignará a un cliente y póliza</div></>
        }
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input placeholder="Buscar archivo o cliente..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 280, background: 'var(--bg-card)', color: 'var(--text-main)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Todos', ...tiposDoc].map((t: string) => <button key={t} onClick={() => setFiltroTipo(t)} className={`filter-btn ${filtroTipo === t ? 'active' : ''}`}>{t}</button>)}
        </div>
      </div>

      {/* Table */}
      <div className="table-card">
        <table>
          <colgroup>
            <col style={{ width: 52 }} /><col /><col style={{ width: 130 }} />
            <col style={{ width: 160 }} /><col style={{ width: 150 }} /><col style={{ width: 90 }} /><col style={{ width: 110 }} /><col style={{ width: 100 }} />
          </colgroup>
          <thead>
            <tr><th></th><th>Archivo</th><th>Tipo</th><th>Cliente</th><th>Póliza</th><th>Tamaño</th><th>Subido</th><th></th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
                Cargando documentos...
              </td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}></div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay documentos subidos</div>
                <div style={{ fontSize: 12 }}>Arrastrá archivos arriba o usá el botón "Subir archivo"</div>
              </td></tr>
            ) : filtrados.map(d => {
              const ext = extStyle[getExt(d.nombre)] || extStyle.pdf
              return (
                <tr key={d.id}>
                  <td>
                    <div style={{ width: 36, height: 36, background: ext.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: ext.color }}>{ext.label}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 500, fontSize: 13 }}>{d.nombre}</td>
                  <td><span className="badge badge-neutral">{d.tipo}</span></td>
                  <td style={{ fontSize: 13 }}>{d.clientes?.nombre || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {d.polizas ? <><span className="badge badge-neutral" style={{ marginRight: 4 }}>{d.polizas.ramo}</span>{d.polizas.numero}</> : '—'}
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatBytes(d.tamanio_bytes)}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatFecha(d.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-outline btn-sm" onClick={() => descargar(d)} title="Descargar"><Download size={13} /></button>
                      <button className="btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => eliminar(d)} title="Eliminar"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {/* Mobile card list */}
        <div className="mobile-list" style={{ display: 'none' }}>
          {filtrados.map(d => {
            const ext = extStyle[getExt(d.nombre)] || extStyle.pdf
            return (
              <div key={d.id} style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5FB', display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 36, height: 36, background: ext.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: ext.color }}>{ext.label}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nombre}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{d.clientes?.nombre || '—'} · {d.tipo} · {formatBytes(d.tamanio_bytes)}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-outline btn-sm" onClick={() => descargar(d)}><Download size={13} /></button>
                  <button className="btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => eliminar(d)}><Trash2 size={13} /></button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* MODAL SUBIR (3 pasos: cliente → póliza → archivo) */}
      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) cerrarModal() }}>
          <div className="pago-modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)' }}>
                  {paso === 'cliente' ? 'Seleccionar cliente' : paso === 'poliza' ? 'Seleccionar póliza' : 'Subir archivo'}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                  Paso {paso === 'cliente' ? 1 : paso === 'poliza' ? 2 : 3} de 3
                  {clienteSel && paso !== 'cliente' && ` — ${clienteSel.nombre}`}
                  {polizaSel && paso === 'archivo' && ` · ${polizaSel.ramo} ${polizaSel.numero}`}
                </div>
              </div>
              <button onClick={cerrarModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>

            {/* Barra de progreso */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
              {['cliente','poliza','archivo'].map((p, i) => {
                const idx = ['cliente','poliza','archivo'].indexOf(paso)
                return <div key={p} style={{ flex: 1, height: 3, borderRadius: 3, transition: 'background .2s', background: i <= idx ? 'var(--gold)' : 'var(--border)' }} />
              })}
            </div>

            {/* Paso 1: cliente */}
            {paso === 'cliente' && (
              <>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input placeholder="Buscar cliente..." value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} autoFocus
                    style={{ width: '100%', padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-main)' }} />
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {clientesFiltrados.map(c => (
                    <div key={c.id}
                      onClick={() => { setClienteSel(c); fetchPolizasCliente(c.id); setPaso('poliza') }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 9, border: '1.5px solid var(--border-soft)', cursor: 'pointer', background: 'var(--bg-card)', transition: 'all .12s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--gold)'; (e.currentTarget as HTMLDivElement).style.background='var(--gold-pale)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--border)'; (e.currentTarget as HTMLDivElement).style.background='white' }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--gold)', fontSize: 14, flexShrink: 0 }}>
                        {c.nombre.trim()[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>{c.nombre}</div>
                        {c.direccion && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.direccion}</div>}
                      </div>
                      <ChevronRight size={16} color="var(--slate)" />
                    </div>
                  ))}
                  {clientesFiltrados.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>No se encontraron clientes</div>}
                </div>
              </>
            )}

            {/* Paso 2: póliza */}
            {paso === 'poliza' && (
              <>
                <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  {polizasCliente.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>Este cliente no tiene pólizas cargadas</div>
                  ) : polizasCliente.map(p => (
                    <div key={p.id}
                      onClick={() => { setPolizaSel(p); setPaso('archivo') }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 9, border: '1.5px solid var(--border-soft)', cursor: 'pointer', background: 'var(--bg-card)', transition: 'all .12s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--gold)'; (e.currentTarget as HTMLDivElement).style.background='var(--gold-pale)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--border)'; (e.currentTarget as HTMLDivElement).style.background='white' }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span className="badge badge-neutral">{p.ramo}</span>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{p.numero}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{p.compania}</div>
                      </div>
                      <ChevronRight size={16} color="var(--slate)" />
                    </div>
                  ))}
                </div>
                <div style={{ paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-start' }}>
                  <button className="btn-outline" onClick={() => setPaso('cliente')}>← Cambiar cliente</button>
                </div>
              </>
            )}

            {/* Paso 3: archivo */}
            {paso === 'archivo' && (
              <>
                {/* Drop zone dentro del modal */}
                <div
                  onClick={() => inputRef.current?.click()}
                  style={{
                    border: `2px dashed ${fileSel ? 'var(--success)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '24px', textAlign: 'center', cursor: 'pointer',
                    background: fileSel ? '#F0FDF8' : '#FAFBFC', marginBottom: 16, transition: 'all .2s'
                  }}
                >
                  {fileSel ? (
                    <>
                      <div style={{ fontSize: 28, marginBottom: 6 }}></div>
                      <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: 14 }}>{fileSel.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{formatBytes(fileSel.size)} · Click para cambiar</div>
                    </>
                  ) : (
                    <>
                      <Upload size={24} style={{ margin: '0 auto 8px', color: 'var(--text-muted)', display: 'block' }} />
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14 }}>Hacé click para seleccionar</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>PDF, JPG, PNG, Word, Excel</div>
                    </>
                  )}
                </div>
                <input ref={inputRef} type="file" style={{ display: 'none' }}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  onChange={e => onFileChange(e.target.files)} />

                <div className="fgroup">
                  <label>Tipo de documento</label>
                  <select value={tipoDoc} onChange={e => setTipoDoc(e.target.value)}>
                    {tiposDoc.map((t: string) => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <button className="btn-outline" onClick={() => setPaso('poliza')}>← Cambiar póliza</button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-outline" onClick={cerrarModal}>Cancelar</button>
                    <button className="btn-primary" onClick={confirmarSubida} disabled={!fileSel}>
                      <Upload size={14} /> Subir archivo
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}


FILEEOF
echo '+ app/(app)/documentos/page.tsx'

cat > 'app/(app)/siniestros/page.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Plus, Search, AlertTriangle, X, ChevronRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import DatePicker from '@/components/DatePicker'

const ESTADOS   = ['En gestión', 'Documentación', 'Pericial', 'Cerrado']
// TIPOS_SIN stays hardcoded - siniestro types are not in catalogs

const estadoColor: Record<string, string> = {
  'En gestión':    'badge-blue',
  'Documentación': 'badge-warning',
  'Pericial':      'badge-neutral',
  'Cerrado':       'badge-success',
}

function formatFecha(iso: string | null) {
  if (!iso) return '—'
  const [y,m,d] = iso.split('-')
  return `${d}/${m}/${y}`
}

type Cliente  = { id: string; nombre: string; direccion: string }
type Poliza   = { id: string; numero: string; ramo: string; compania: string; vencimiento: string | null }
type Siniestro = {
  id: string
  tipo: string
  descripcion: string
  fecha_ocurrencia: string | null
  estado: string
  created_at: string
  polizas: { numero: string; ramo: string; compania: string } | null
  clientes: { nombre: string } | null
}

type Paso = 'cliente' | 'poliza' | 'datos'

export default function SiniestrosPage() {
  const supabase = createClient()

  const [tiposSin, setTiposSin]       = useState<string[]>([])
  const [tiposDoc, setTiposDoc]       = useState<string[]>([])
  const [siniestros, setSiniestros]   = useState<Siniestro[]>([])
  const [clientes, setClientes]       = useState<Cliente[]>([])
  const [polizasCliente, setPolizasCliente] = useState<Poliza[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filtro, setFiltro]           = useState('Todos')

  // Modal
  const [showModal, setShowModal]     = useState(false)
  const [paso, setPaso]               = useState<Paso>('cliente')
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteSel, setClienteSel]   = useState<Cliente | null>(null)
  const [polizaSel, setPolizaSel]     = useState<Poliza | null>(null)
  const [saving, setSaving]           = useState(false)
  const [form, setForm]               = useState({
    tipo: 'Choque', descripcion: '', fecha_ocurrencia: new Date().toISOString().slice(0,10), estado: 'En gestión'
  })

  useEffect(() => {
    fetchSiniestros()
    fetchClientes()
    Promise.all([
      supabase.from('tipos_siniestro').select('nombre').order('nombre'),
      supabase.from('tipos_documento').select('nombre').order('nombre'),
    ]).then(([ts, td]) => {
      setTiposSin((ts.data || []).map((x: any) => x.nombre))
      setTiposDoc((td.data || []).map((x: any) => x.nombre))
    })
  }, [])

  async function fetchSiniestros() {
    setLoading(true)
    const { data } = await supabase
      .from('siniestros')
      .select('*, polizas(numero, ramo, compania), clientes(nombre)')
      .order('created_at', { ascending: false })
    if (data) setSiniestros(data)
    setLoading(false)
  }

  async function fetchClientes() {
    const { data } = await supabase.from('clientes').select('id, nombre, direccion').order('nombre')
    if (data) setClientes(data)
  }

  async function fetchPolizasCliente(clienteId: string) {
    const { data } = await supabase
      .from('polizas')
      .select('id, numero, ramo, compania, vencimiento')
      .eq('cliente_id', clienteId)
      .order('ramo')
    setPolizasCliente(data || [])
  }

  async function guardarSiniestro() {
    if (!clienteSel) return
    setSaving(true)
    const { error } = await supabase.from('siniestros').insert([{
      cliente_id:       clienteSel.id,
      poliza_id:        polizaSel?.id || null,
      tipo:             form.tipo,
      descripcion:      form.descripcion,
      fecha_ocurrencia: form.fecha_ocurrencia || null,
      estado:           form.estado,
    }])
    if (!error) {
      cerrarModal()
      await fetchSiniestros()
    }
    setSaving(false)
  }

  async function cambiarEstado(id: string, estado: string) {
    await supabase.from('siniestros').update({ estado }).eq('id', id)
    await fetchSiniestros()
  }

  function abrirModal() {
    setPaso('cliente'); setClienteSearch(''); setClienteSel(null); setPolizaSel(null)
    setPolizasCliente([])
    setForm({ tipo: 'Choque', descripcion: '', fecha_ocurrencia: new Date().toISOString().slice(0,10), estado: 'En gestión' })
    setShowModal(true)
  }

  function cerrarModal() { setShowModal(false); setClienteSel(null); setPolizaSel(null); setPaso('cliente') }

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    (c.direccion || '').toLowerCase().includes(clienteSearch.toLowerCase())
  )

  const filtrados = siniestros.filter(s => {
    const q = search.toLowerCase()
    return (!q || (s.clientes?.nombre || '').toLowerCase().includes(q) || (s.polizas?.numero || '').toLowerCase().includes(q) || s.tipo.toLowerCase().includes(q)) &&
           (filtro === 'Todos' || s.estado === filtro)
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Siniestros</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            {loading ? 'Cargando...' : `${siniestros.filter(s => s.estado !== 'Cerrado').length} abiertos · ${siniestros.filter(s => s.estado === 'Cerrado').length} cerrados`}
          </p>
        </div>
        <button className="btn-primary" onClick={abrirModal}><Plus size={15} /> Nuevo siniestro</button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input placeholder="Buscar cliente, póliza o tipo..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 280, background: 'var(--bg-card)', color: 'var(--text-main)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Todos', ...ESTADOS].map(t =>
            <button key={t} onClick={() => setFiltro(t)} className={`filter-btn ${filtro === t ? 'active' : ''}`}>{t}</button>
          )}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Cargando siniestros...
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}></div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay siniestros registrados</div>
          <div style={{ fontSize: 12 }}>Usá el botón "Nuevo siniestro" para registrar uno</div>
        </div>
      ) : filtrados.map(s => (
        <div key={s.id} style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', padding: '18px 20px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 42, height: 42, background: '#FEE2E2', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={18} color="#D94F4F" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{s.clientes?.nombre || '—'}</span>
                <span className={`badge ${estadoColor[s.estado] || 'badge-neutral'}`}>{s.estado}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>{s.tipo}</div>
              {s.polizas && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                  <span className="badge badge-neutral" style={{ marginRight: 6 }}>{s.polizas.ramo}</span>
                  <span style={{ fontFamily: 'monospace' }}>{s.polizas.numero}</span>
                  {' · '}{s.polizas.compania}
                </div>
              )}
              {s.descripcion && <div style={{ fontSize: 13, color: 'var(--text-main)', marginTop: 4 }}>{s.descripcion}</div>}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Fecha</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{formatFecha(s.fecha_ocurrencia)}</div>
              {/* Cambiar estado */}
              <select
                value={s.estado}
                onChange={e => cambiarEstado(s.id, e.target.value)}
                style={{ marginTop: 8, padding: '5px 10px', border: '1.5px solid var(--border-soft)', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-main)' }}
              >
                {ESTADOS.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
          </div>
        </div>
      ))}

      {/* MODAL NUEVO SINIESTRO (3 pasos) ─────────────────────────*/}
      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) cerrarModal() }}>
          <div className="pago-modal" style={{ width: paso === 'datos' ? 540 : 480 }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)' }}>
                  {paso === 'cliente' ? 'Seleccionar cliente' : paso === 'poliza' ? 'Seleccionar póliza' : 'Datos del siniestro'}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                  Paso {paso === 'cliente' ? '1' : paso === 'poliza' ? '2' : '3'} de 3
                  {clienteSel && paso !== 'cliente' && ` — ${clienteSel.nombre}`}
                  {polizaSel && paso === 'datos' && ` · ${polizaSel.ramo} ${polizaSel.numero}`}
                </div>
              </div>
              <button onClick={cerrarModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>

            {/* Barra de progreso */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
              {['cliente','poliza','datos'].map((p, i) => (
                <div key={p} style={{ flex: 1, height: 3, borderRadius: 3, transition: 'background .2s',
                  background: (paso === 'poliza' && i <= 1) || (paso === 'datos' && i <= 2) || (paso === 'cliente' && i === 0) ? 'var(--gold)' : 'var(--border)'
                }} />
              ))}
            </div>

            {/* Paso 1: cliente */}
            {paso === 'cliente' && (
              <>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input placeholder="Buscar cliente..." value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} autoFocus
                    style={{ width: '100%', padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-main)' }} />
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {clientesFiltrados.map(c => (
                    <div key={c.id} onClick={() => { setClienteSel(c); fetchPolizasCliente(c.id); setPaso('poliza') }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 9, border: '1.5px solid var(--border-soft)', cursor: 'pointer', background: 'var(--bg-card)', transition: 'all .12s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--gold)'; (e.currentTarget as HTMLDivElement).style.background='var(--gold-pale)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--border)'; (e.currentTarget as HTMLDivElement).style.background='white' }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--gold)', fontSize: 14, flexShrink: 0 }}>
                        {c.nombre.trim()[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>{c.nombre}</div>
                        {c.direccion && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.direccion}</div>}
                      </div>
                      <ChevronRight size={16} color="var(--slate)" />
                    </div>
                  ))}
                  {clientesFiltrados.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>No se encontraron clientes</div>}
                </div>
              </>
            )}

            {/* Paso 2: póliza */}
            {paso === 'poliza' && (
              <>
                <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {polizasCliente.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>
                      Este cliente no tiene pólizas cargadas
                    </div>
                  ) : polizasCliente.map(p => (
                    <div key={p.id} onClick={() => { setPolizaSel(p); setPaso('datos') }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 9, border: '1.5px solid var(--border-soft)', cursor: 'pointer', background: 'var(--bg-card)', transition: 'all .12s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--gold)'; (e.currentTarget as HTMLDivElement).style.background='var(--gold-pale)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--border)'; (e.currentTarget as HTMLDivElement).style.background='white' }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span className="badge badge-neutral">{p.ramo}</span>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{p.numero}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                          {p.compania}{p.vencimiento ? ` · Vence ${formatFecha(p.vencimiento)}` : ''}
                        </div>
                      </div>
                      <ChevronRight size={16} color="var(--slate)" />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn-outline" onClick={() => setPaso('cliente')}>← Cambiar cliente</button>
                  <button className="btn-outline" onClick={() => { setPolizaSel(null); setPaso('datos') }}>Sin póliza específica →</button>
                </div>
              </>
            )}

            {/* Paso 3: datos */}
            {paso === 'datos' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                  <div className="fgroup">
                    <label>Tipo de siniestro *</label>
                    <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                      {tiposSin.map((t: string) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="fgroup">
                    <label>Fecha de ocurrencia</label>
                    <DatePicker value={form.fecha_ocurrencia} onChange={v => setForm({ ...form, fecha_ocurrencia: v })} />
                  </div>
                  <div className="fgroup">
                    <label>Estado inicial</label>
                    <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                      {ESTADOS.map(e => <option key={e}>{e}</option>)}
                    </select>
                  </div>
                  <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                    <label>Descripción</label>
                    <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
                      placeholder="Describí brevemente el siniestro..."
                      rows={3}
                      style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: 'var(--text-main)' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <button className="btn-outline" onClick={() => setPaso('poliza')}>← Cambiar póliza</button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-outline" onClick={cerrarModal}>Cancelar</button>
                    <button className="btn-primary" onClick={guardarSiniestro} disabled={saving}>
                      {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : 'Guardar siniestro'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}


FILEEOF
echo '+ app/(app)/siniestros/page.tsx'

cat > 'app/(app)/usuarios/page.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Loader2, Shield, User, Plus, X, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthProvider'
import { useRouter } from 'next/navigation'

type Usuario = {
  id: string; email: string; nombre: string | null
  rol: 'admin' | 'superadmin'; activo: boolean; created_at: string
}

export default function UsuariosPage() {
  const supabase = createClient()
  const { esSuperAdmin, loading: loadingRol } = useAuth()
  const router = useRouter()

  const [usuarios, setUsuarios]     = useState<Usuario[]>([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const [toast, setToast]           = useState<string | null>(null)
  const [form, setForm]             = useState({ email: '', nombre: '', rol: 'admin' as 'admin' | 'superadmin', password: '' })

  // Password change
  const [showPassModal, setShowPassModal] = useState<Usuario | null>(null)
  const [newPassword, setNewPassword]     = useState('')
  const [savingPass, setSavingPass]       = useState(false)

  useEffect(() => {
    if (!loadingRol && !esSuperAdmin) router.push('/dashboard')
  }, [loadingRol, esSuperAdmin])

  useEffect(() => { fetchUsuarios() }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  async function fetchUsuarios() {
    setLoading(true)
    const { data } = await supabase.from('usuarios').select('*').order('created_at')
    if (data) setUsuarios(data)
    setLoading(false)
  }

  async function crearUsuario() {
    if (!form.email || !form.password) return
    setSaving(true)
    const { data: authData, error: authErr } = await supabase.auth.signUp({ email: form.email, password: form.password })
    if (authErr || !authData.user) {
      showToast('Error: ' + (authErr?.message || 'No se pudo crear'))
      setSaving(false)
      return
    }
    await supabase.from('usuarios').insert([{ id: authData.user.id, email: form.email, nombre: form.nombre || null, rol: form.rol }])
    setShowModal(false)
    setForm({ email: '', nombre: '', rol: 'admin', password: '' })
    showToast(`Usuario ${form.email} creado`)
    await fetchUsuarios()
    setSaving(false)
  }

  async function cambiarPassword() {
    if (!showPassModal || newPassword.length < 6) return
    setSavingPass(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: showPassModal.id, password: newPassword }),
      })
      const data = await res.json()
      if (data.ok) {
        showToast(`Contraseña actualizada para ${showPassModal.nombre || showPassModal.email}`)
        setShowPassModal(null)
        setNewPassword('')
      } else {
        showToast('Error: ' + (data.error || 'No se pudo cambiar'))
      }
    } catch {
      showToast('Error al conectar con el servidor')
    }
    setSavingPass(false)
  }

  async function cambiarRol(u: Usuario, nuevoRol: 'admin' | 'superadmin') {
    await supabase.from('usuarios').update({ rol: nuevoRol }).eq('id', u.id)
    showToast(`Rol actualizado a ${nuevoRol}`)
    await fetchUsuarios()
  }

  async function toggleActivo(u: Usuario) {
    await supabase.from('usuarios').update({ activo: !u.activo }).eq('id', u.id)
    showToast(u.activo ? 'Usuario desactivado' : 'Usuario activado')
    await fetchUsuarios()
  }

  if (loadingRol) return null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Usuarios</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Gestión de accesos al sistema</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> Nuevo usuario</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total usuarios',        value: usuarios.length,                                    bg: '#EEF2F8', color: 'var(--text-main)' },
          { label: 'Super Admin',           value: usuarios.filter(u => u.rol === 'superadmin').length, bg: 'var(--gold-pale,#FEF3C7)', color: '#7A5800' },
          { label: 'Activos',               value: usuarios.filter(u => u.activo).length,              bg: '#E6F5EF', color: '#1A7A4E' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border-soft)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: s.color, opacity: .7, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : usuarios.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay usuarios registrados</div>
        </div>
      ) : usuarios.map(u => (
        <div key={u.id} style={{
          background: 'var(--bg-card)', borderRadius: 12, marginBottom: 8,
          border: `1px solid ${u.rol === 'superadmin' ? 'rgba(201,168,76,.3)' : 'var(--border)'}`,
          padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
          opacity: u.activo ? 1 : 0.5
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, flexShrink: 0, background: u.rol === 'superadmin' ? 'var(--navy)' : '#EEF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {u.rol === 'superadmin' ? <Shield size={20} color="var(--gold)" /> : <User size={20} color="var(--slate)" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>{u.nombre || u.email}</div>
            {u.nombre && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{u.email}</div>}
            <div style={{ marginTop: 4 }}>
              <span className={`badge ${u.rol === 'superadmin' ? 'badge-gold' : 'badge-neutral'}`}>
                {u.rol === 'superadmin' ? 'Super Admin' : 'Admin'}
              </span>
              {!u.activo && <span className="badge badge-danger" style={{ marginLeft: 6 }}>Inactivo</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <select value={u.rol} onChange={e => cambiarRol(u, e.target.value as any)}
              style={{ height: 36, padding: '0 10px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-main)', minWidth: 120 }}>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
            <button className="btn-outline btn-sm" title="Cambiar contraseña"
              style={{ height: 36, display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => { setShowPassModal(u); setNewPassword('') }}>
              <KeyRound size={13} /> Contraseña
            </button>
            <button className={u.activo ? 'btn-outline btn-sm' : 'btn-primary btn-sm'}
              style={{ fontSize: 12, height: 36, whiteSpace: 'nowrap' }}
              onClick={() => toggleActivo(u)}>
              {u.activo ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </div>
      ))}

      {/* Modal nuevo usuario */}
      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="pago-modal" style={{ width: 460 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Nuevo usuario</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div className="fgroup"><label>Email *</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="usuario@fascioli.com.uy" autoFocus /></div>
            <div className="fgroup"><label>Nombre</label>
              <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Nombre completo" /></div>
            <div className="fgroup"><label>Contraseña inicial *</label>
              <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Mínimo 6 caracteres" /></div>
            <div className="fgroup"><label>Rol</label>
              <select value={form.rol} onChange={e => setForm({...form, rol: e.target.value as any})}>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={crearUsuario} disabled={saving || !form.email || !form.password}>
                {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Creando...</> : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cambiar contraseña */}
      {showPassModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) { setShowPassModal(null); setNewPassword('') } }}>
          <div className="pago-modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KeyRound size={16} color="var(--gold)" />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Cambiar contraseña</h3>
              </div>
              <button onClick={() => { setShowPassModal(null); setNewPassword('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, padding: '10px 14px', background: 'var(--bg-card-alt)', borderRadius: 8, borderLeft: '3px solid var(--gold)' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{showPassModal.nombre || showPassModal.email}</div>
              {showPassModal.nombre && <div style={{ fontSize: 11, marginTop: 2 }}>{showPassModal.email}</div>}
            </div>
            <div className="fgroup">
              <label>Nueva contraseña</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres" autoFocus
                onKeyDown={e => e.key === 'Enter' && newPassword.length >= 6 && cambiarPassword()} />
              {newPassword.length > 0 && newPassword.length < 6 && (
                <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>Mínimo 6 caracteres</div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => { setShowPassModal(null); setNewPassword('') }}>Cancelar</button>
              <button className="btn-primary" onClick={cambiarPassword} disabled={savingPass || newPassword.length < 6}>
                {savingPass ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Cambiando...</> : 'Cambiar contraseña'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 300, background: 'var(--navy)', color: 'white', padding: '12px 20px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,.2)', borderLeft: '3px solid var(--gold)' }}>{toast}</div>}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

FILEEOF
echo '+ app/(app)/usuarios/page.tsx'

cat > 'app/(app)/historial/page.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Loader2, RotateCcw, Search, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRol } from '@/lib/useRol'
import { useRouter } from 'next/navigation'

type LogEntry = {
  id: string
  usuario_email: string
  accion: 'crear' | 'editar' | 'eliminar'
  tabla: string
  registro_id: string | null
  descripcion: string
  datos_antes: any
  datos_despues: any
  revertido: boolean
  created_at: string
}

const accionColor: Record<string, string> = {
  crear:    'badge-success',
  editar:   'badge-blue',
  eliminar: 'badge-danger',
}
const accionBg: Record<string, string> = {
  crear:    '#E6F5EF',
  editar:   '#DBEAFE',
  eliminar: '#FEE2E2',
}
const accionColor2: Record<string, string> = {
  crear:    '#1A7A4E',
  editar:   '#1E40AF',
  eliminar: '#991B1B',
}
const tablaLabel: Record<string, string> = {
  clientes: 'Cliente', polizas: 'Póliza', pagos: 'Pago', siniestros: 'Siniestro', documentos: 'Documento',
}

function formatFecha(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })
}

export default function HistorialPage() {
  const supabase = createClient()
  const { esSuperAdmin, loading: loadingRol } = useRol()
  const router = useRouter()
  const [logs, setLogs]             = useState<LogEntry[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filtroTabla, setFiltroTabla]   = useState('Todos')
  const [filtroAccion, setFiltroAccion] = useState('Todos')
  const [reverting, setReverting]   = useState<string | null>(null)
  const [toast, setToast]           = useState<string | null>(null)
  const [expandido, setExpandido]   = useState<string | null>(null)

  useEffect(() => {
    if (!loadingRol && !esSuperAdmin) router.push('/dashboard')
  }, [loadingRol, esSuperAdmin])

  useEffect(() => { fetchLogs() }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3500) }

  async function fetchLogs() {
    setLoading(true)
    const { data } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200)
    if (data) setLogs(data)
    setLoading(false)
  }

  async function revertir(log: LogEntry) {
    if (!confirm(`¿Revertir esta acción?\n${log.descripcion}`)) return
    setReverting(log.id)
    try {
      if (log.accion === 'crear' && log.registro_id) {
        await supabase.from(log.tabla).delete().eq('id', log.registro_id)
        showToast('Creación revertida — registro eliminado')
      } else if (log.accion === 'eliminar' && log.datos_antes) {
        await supabase.from(log.tabla).insert([log.datos_antes])
        showToast('Registro restaurado correctamente')
      } else if (log.accion === 'editar' && log.datos_antes && log.registro_id) {
        const { id, created_at, ...resto } = log.datos_antes
        await supabase.from(log.tabla).update(resto).eq('id', log.registro_id)
        showToast('Cambios revertidos correctamente')
      }
      await supabase.from('audit_log').update({ revertido: true }).eq('id', log.id)
      await fetchLogs()
    } catch { showToast('Error al revertir') }
    setReverting(null)
  }

  const filtrados = logs.filter(l => {
    const q = search.toLowerCase()
    return (!q || l.descripcion?.toLowerCase().includes(q) || l.usuario_email?.toLowerCase().includes(q)) &&
           (filtroTabla === 'Todos' || l.tabla === filtroTabla) &&
           (filtroAccion === 'Todos' || l.accion === filtroAccion)
  })

  const stats = {
    total:    logs.length,
    hoy:      logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length,
    eliminar: logs.filter(l => l.accion === 'eliminar' && !l.revertido).length,
  }

  if (loadingRol) return null

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Historial de cambios</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Solo visible para Super Admin</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total acciones',     value: stats.total,    bg: '#EEF2F8', color: 'var(--text-main)' },
          { label: 'Acciones hoy',       value: stats.hoy,      bg: '#DBEAFE', color: '#1E40AF' },
          { label: 'Eliminaciones activas', value: stats.eliminar, bg: '#FEE2E2', color: '#991B1B' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border-soft)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: s.color, opacity: .7, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input placeholder="Buscar acción o usuario..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ padding: '8px 14px 8px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', width: 240, background: 'var(--bg-card)', color: 'var(--text-main)' }} />
          </div>
          <div style={{ width: 1, height: 28, background: 'var(--border)', flexShrink: 0 }} />
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Módulo:</span>
            {['Todos','clientes','polizas','pagos','siniestros','documentos'].map(t =>
              <button key={t} onClick={() => setFiltroTabla(t)} className={`filter-btn ${filtroTabla === t ? 'active' : ''}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                {t === 'Todos' ? 'Todos' : tablaLabel[t]}
              </button>
            )}
          </div>
          <div style={{ width: 1, height: 28, background: 'var(--border)', flexShrink: 0 }} />
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Acción:</span>
            {['Todos','crear','editar','eliminar'].map(a =>
              <button key={a} onClick={() => setFiltroAccion(a)} className={`filter-btn ${filtroAccion === a ? 'active' : ''}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                {a === 'Todos' ? 'Todas' : a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Cargando historial...
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Sin registros aún</div>
          <div style={{ fontSize: 12 }}>Las acciones del sistema aparecerán aquí automáticamente</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtrados.map(log => (
            <div key={log.id} style={{
              background: log.revertido ? '#F8FAFC' : 'white',
              borderRadius: 12, border: '1px solid var(--border-soft)',
              overflow: 'hidden', opacity: log.revertido ? 0.55 : 1,
              transition: 'box-shadow .15s'
            }}>
              <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                onClick={() => setExpandido(expandido === log.id ? null : log.id)}>

                {/* Acción dot */}
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: accionColor2[log.accion], flexShrink: 0 }} />

                {/* Badges */}
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: accionBg[log.accion], color: accionColor2[log.accion], flexShrink: 0 }}>
                  {log.accion.charAt(0).toUpperCase() + log.accion.slice(1)}
                </span>
                <span className="badge badge-neutral" style={{ fontSize: 11, flexShrink: 0 }}>
                  {tablaLabel[log.tabla] || log.tabla}
                </span>

                {/* Descripción */}
                <div style={{ flex: 1, fontSize: 13, color: 'var(--text-main)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.descripcion}
                </div>

                {log.revertido && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', flexShrink: 0, background: 'var(--bg-card-alt)', padding: '2px 8px', borderRadius: 6 }}>Revertido</span>
                )}

                {/* Usuario + fecha */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)' }}>{log.usuario_email?.split('@')[0]}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatFecha(log.created_at)}</div>
                </div>

                {/* Revertir */}
                {!log.revertido && (log.accion !== 'editar' || log.datos_antes) && (
                  <button className="btn-outline btn-sm"
                    style={{ fontSize: 11, color: 'var(--danger)', borderColor: '#FEE2E2', flexShrink: 0 }}
                    onClick={e => { e.stopPropagation(); revertir(log) }}
                    disabled={reverting === log.id}
                  >
                    {reverting === log.id
                      ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                      : <><RotateCcw size={12} /> Revertir</>}
                  </button>
                )}

                <ChevronDown size={14} color="var(--slate)" style={{ flexShrink: 0, transition: 'transform .2s', transform: expandido === log.id ? 'rotate(180deg)' : '' }} />
              </div>

              {/* Detalle */}
              {expandido === log.id && (
                <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: log.datos_antes && log.datos_despues ? '1fr 1fr' : '1fr', gap: 12, marginTop: 12 }}>
                    {log.datos_antes && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#991B1B', marginBottom: 6 }}>Antes</div>
                        <pre style={{ fontSize: 11, background: '#FEF2F2', borderRadius: 8, padding: '10px 12px', overflow: 'auto', maxHeight: 200, color: 'var(--text-main)', margin: 0, lineHeight: 1.5 }}>
                          {JSON.stringify(log.datos_antes, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.datos_despues && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#1A7A4E', marginBottom: 6 }}>Después</div>
                        <pre style={{ fontSize: 11, background: '#F0FDF4', borderRadius: 8, padding: '10px 12px', overflow: 'auto', maxHeight: 200, color: 'var(--text-main)', margin: 0, lineHeight: 1.5 }}>
                          {JSON.stringify(log.datos_despues, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 300, background: 'var(--navy)', color: 'white', padding: '12px 20px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,.2)', borderLeft: '3px solid var(--gold)' }}>{toast}</div>}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}


FILEEOF
echo '+ app/(app)/historial/page.tsx'

cat > 'components/DatePicker.tsx' << 'FILEEOF'
'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS  = ['Lu','Ma','Mi','Ju','Vi','Sá','Do']

type Props = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
}

export default function DatePicker({ value, onChange, placeholder = 'Seleccionar fecha', disabled }: Props) {
  const [open, setOpen]         = useState(false)
  const [viewYear, setViewYear] = useState(() => value ? parseInt(value.slice(0,4)) : new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => value ? parseInt(value.slice(5,7)) - 1 : new Date().getMonth())
  const [pos, setPos]           = useState({ top: 0, left: 0, width: 0 })
  const triggerRef              = useRef<HTMLDivElement>(null)
  const calRef                  = useRef<HTMLDivElement>(null)

  // Calculate dropdown position when opening
  function openCalendar() {
    if (disabled || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const calH = 340 // approximate calendar height
    const spaceBelow = window.innerHeight - rect.bottom
    const top = spaceBelow >= calH
      ? rect.bottom + window.scrollY + 6
      : rect.top + window.scrollY - calH - 6
    setPos({ top, left: rect.left + window.scrollX, width: Math.max(rect.width, 280) })
    setOpen(o => !o)
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        calRef.current && !calRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on scroll
  useEffect(() => {
    if (!open) return
    const handler = () => setOpen(false)
    window.addEventListener('scroll', handler, true)
    return () => window.removeEventListener('scroll', handler, true)
  }, [open])

  // Sync view when value changes
  useEffect(() => {
    if (value) {
      setViewYear(parseInt(value.slice(0,4)))
      setViewMonth(parseInt(value.slice(5,7)) - 1)
    }
  }, [value])

  function formatDisplay(v: string) {
    if (!v) return ''
    const [y, m, d] = v.split('-')
    return `${d}/${m}/${y}`
  }

  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate()
  }

  function getFirstDayOfMonth(year: number, month: number) {
    const d = new Date(year, month, 1).getDay()
    return d === 0 ? 6 : d - 1
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function selectDay(day: number) {
    const mm = String(viewMonth + 1).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    onChange(`${viewYear}-${mm}-${dd}`)
    setOpen(false)
  }

  const today    = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  const daysInMonth    = getDaysInMonth(viewYear, viewMonth)
  const firstDayOffset = getFirstDayOfMonth(viewYear, viewMonth)

  const cells: (number | null)[] = [
    ...Array(firstDayOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const calendar = (
    <div
      ref={calRef}
      style={{
        position: 'absolute',
        top: pos.top,
        left: pos.left,
        width: Math.max(pos.width, 280),
        zIndex: 9999,
        background: 'var(--bg-card)',
        borderRadius: 14,
        border: '1.5px solid var(--border-soft)',
        boxShadow: '0 16px 48px rgba(15,30,53,.18)',
        padding: '16px',
        animation: 'dpFadeIn .15s ease',
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Month/Year nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button onClick={prevMonth}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F4F7FB')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        ><ChevronLeft size={16} /></button>

        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-main)', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span>{MESES[viewMonth]}</span>
          <select value={viewYear} onChange={e => setViewYear(+e.target.value)}
            style={{ border: 'none', background: 'none', fontWeight: 800, fontSize: 15, color: 'var(--text-main)', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
            {Array.from({ length: 15 }, (_, i) => today.getFullYear() - 2 + i).map(y =>
              <option key={y} value={y}>{y}</option>
            )}
          </select>
        </div>

        <button onClick={nextMonth}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F4F7FB')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        ><ChevronRight size={16} /></button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 6 }}>
        {DIAS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />
          const mm  = String(viewMonth + 1).padStart(2, '0')
          const dd  = String(day).padStart(2, '0')
          const str = `${viewYear}-${mm}-${dd}`
          const isSel   = str === value
          const isToday = str === todayStr
          return (
            <div key={idx} onClick={() => selectDay(day)}
              style={{
                textAlign: 'center', padding: '7px 4px', borderRadius: 8,
                fontSize: 13.5, fontWeight: isSel || isToday ? 700 : 400,
                cursor: 'pointer', transition: 'all .1s',
                background: isSel ? 'var(--navy)' : isToday ? 'var(--gold-pale)' : 'transparent',
                color: isSel ? 'var(--gold)' : isToday ? 'var(--gold)' : 'var(--navy)',
                border: isToday && !isSel ? '1.5px solid var(--gold)' : '1.5px solid transparent',
              }}
              onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLDivElement).style.background = '#F4F7FB' }}
              onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLDivElement).style.background = isToday ? 'var(--gold-pale)' : 'transparent' }}
            >
              {day}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => { onChange(todayStr); setOpen(false) }}
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--gold-pale)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >Hoy</button>
        {value && (
          <button onClick={() => { onChange(''); setOpen(false) }}
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F4F7FB')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >Limpiar</button>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Trigger */}
      <div ref={triggerRef} onClick={openCalendar} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 13px',
        border: `1.5px solid ${open ? 'var(--gold)' : 'var(--border)'}`,
        borderRadius: 8,
        background: disabled ? '#F8FAFC' : 'white',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'border-color .14s',
        userSelect: 'none',
      }}>
        <Calendar size={15} color={value ? 'var(--navy)' : 'var(--slate)'} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 14, color: value ? 'var(--navy)' : 'var(--slate)' }}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        {value && !disabled && (
          <span onClick={e => { e.stopPropagation(); onChange('') }}
            style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1, padding: '0 2px', cursor: 'pointer' }}>×</span>
        )}
      </div>

      {/* Portal calendar — renders outside any overflow:hidden container */}
      {open && typeof document !== 'undefined' && createPortal(calendar, document.body)}

      <style>{`
        @keyframes dpFadeIn {
          from { opacity: 0; transform: translateY(4px) }
          to   { opacity: 1; transform: translateY(0) }
        }
      `}</style>
    </>
  )
}


FILEEOF
echo '+ components/DatePicker.tsx'

git add .
git commit -m 'feat modo oscuro con toggle y deteccion automatica del sistema'
git push
