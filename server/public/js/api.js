// ============================================================
// Cliente API + WebSocket (OOP) - RobotCar IoT
// ============================================================

class ApiClient {
  constructor(base = '/api') { this.base = base; }

  async _req(path, opts = {}) {
    const res = await fetch(this.base + path, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Error HTTP ' + res.status);
    }
    return res.json();
  }

  // Dispositivos
  listDispositivos()             { return this._req('/dispositivos'); }
  getDispositivo(id)             { return this._req('/dispositivos/' + id); }
  createDispositivo(data)        { return this._req('/dispositivos',        { method: 'POST', body: data }); }
  updateDispositivo(id, data)    { return this._req('/dispositivos/' + id,  { method: 'PUT',  body: data }); }
  deleteDispositivo(id)          { return this._req('/dispositivos/' + id,  { method: 'DELETE' }); }
  setEstado(id, estado)          { return this._req(`/dispositivos/${id}/estado`, { method: 'PUT', body: { estado } }); }
  getHistorial(id, limit = 10)   { return this._req(`/dispositivos/${id}/historial?limit=${limit}`); }
  getMonitoreo()                 { return this._req('/monitoreo'); }

  // Movimientos
  listMovimientos()              { return this._req('/movimientos'); }
  ejecutarMovimiento(id)         { return this._req('/ejecutar/' + id, { method: 'POST' }); }
  ultimoMovimiento()             { return this._req('/ultimo-movimiento'); }

  // Parámetros de motores
  listParametros()               { return this._req('/parametros'); }
  setParametro(factor, valor)    { return this._req('/parametros/' + encodeURIComponent(factor), { method: 'PUT', body: { valor } }); }
  createParametro(factor, valor) { return this._req('/parametros',  { method: 'POST', body: { factor, valor } }); }
  deleteParametro(factor)        { return this._req('/parametros/' + encodeURIComponent(factor), { method: 'DELETE' }); }

  // Demos (rutinas)
  listDemos()                    { return this._req('/demos'); }
  getDemo(id)                    { return this._req('/demos/' + id); }
  createDemo(data)               { return this._req('/demos',        { method: 'POST', body: data }); }
  updateDemo(id, data)           { return this._req('/demos/' + id,  { method: 'PUT',  body: data }); }
  deleteDemo(id)                 { return this._req('/demos/' + id,  { method: 'DELETE' }); }
  ejecutarDemo(id)               { return this._req(`/demos/${id}/ejecutar`, { method: 'POST' }); }
  cancelarDemo()                 { return this._req('/demos/cancelar', { method: 'POST' }); }

  // Obstáculos
  listObstaculos(limit = 10)     { return this._req(`/obstaculos?limit=${limit}`); }
  obstaculoStats()               { return this._req('/obstaculos/estadisticas'); }
  simularObstaculo(distancia)    { return this._req('/obstaculos', { method: 'POST', body: { distancia, origen: 'manual' } }); }

  // Historial
  historialMovimientos(limit = 10) { return this._req(`/historial/movimientos?limit=${limit}`); }
  historialDemos(limit = 10)       { return this._req(`/historial/demos?limit=${limit}`); }
}

// ------------------------------------------------------------
// WS reconectable con suscripción por eventos
// ------------------------------------------------------------
class RealtimeBus extends EventTarget {
  constructor() {
    super();
    this.ws = null;
    this.connect();
  }
  connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    this.ws = new WebSocket(`${proto}://${location.host}`);
    this.ws.onopen    = () => this.dispatchEvent(new Event('open'));
    this.ws.onclose   = () => { this.dispatchEvent(new Event('close')); setTimeout(() => this.connect(), 2000); };
    this.ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.evento) this.dispatchEvent(new CustomEvent(data.evento, { detail: data }));
        this.dispatchEvent(new CustomEvent('message', { detail: data }));
      } catch {}
    };
  }
  send(obj) { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(obj)); }
}

// ------------------------------------------------------------
// Layout compartido: navbar + footer
// ------------------------------------------------------------
class Layout {
  static render(activePage = '') {
    const links = [
      { id: 'home',     label: 'Inicio',     href: '/' },
      { id: 'admin',    label: 'Administración', href: '/admin.html' },
      { id: 'control',  label: 'Control',    href: '/control.html' },
      { id: 'demos',    label: 'Demos',      href: '/demos.html' },
      { id: 'monitor',  label: 'Monitoreo',  href: '/monitoreo.html' }
    ];
    const navItems = links.map(l => `
      <li class="nav-item">
        <a class="nav-link ${l.id === activePage ? 'active fw-bold' : ''}" href="${l.href}">${l.label}</a>
      </li>
    `).join('');

    const nav = `
      <nav class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
        <div class="container">
          <a class="navbar-brand d-flex align-items-center gap-2" href="/">
            <img src="/favicon.svg" alt="logo"> <span>RobotCar IoT</span>
          </a>
          <button class="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#mainNav">
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" id="mainNav">
            <ul class="navbar-nav ms-auto">${navItems}</ul>
          </div>
        </div>
      </nav>`;

    const footer = `
      <footer class="mt-auto">
        <div class="container">
          <small>
            &copy; ${new Date().getFullYear()} <strong>Misael López Cancino</strong> &middot;
            Proyecto IoT ESP8266 &middot; <a href="/">RobotCar</a>
          </small>
        </div>
      </footer>`;

    document.getElementById('navbar')?.insertAdjacentHTML('beforeend', nav);
    document.getElementById('footer')?.insertAdjacentHTML('beforeend', footer);
  }
}

// Helpers globales
function showAlert(msg, type = 'success', container = '#alerts') {
  const el = document.querySelector(container);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
    ${msg}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  </div>`;
  setTimeout(() => el.querySelector('.alert')?.classList.remove('show'), 3500);
}

const api = new ApiClient();
