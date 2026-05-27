// control.js — Switches por dispositivo + botones de movimiento (OOP)
Layout.render('control');

class DeviceCard {
  constructor(d, onToggle) { this.d = d; this.onToggle = onToggle; }
  render() {
    const id = 'sw_' + this.d.id;
    const col = document.createElement('div');
    col.className = 'col-md-4';
    col.innerHTML = `
      <div class="card card-device shadow-sm h-100">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h5 class="card-title mb-0">${this.d.nombre}</h5>
              <small class="text-muted">${this.d.tipo}${this.d.pin ? ' &middot; pin ' + this.d.pin : ''}</small>
            </div>
            <span class="status-dot ${this.d.estado ? 'status-on status-pulse' : 'status-off'}" id="dot_${this.d.id}"></span>
          </div>
          <p class="text-muted small mt-2 mb-3">${this.d.descripcion || ''}</p>
          <div class="form-check form-switch fs-5">
            <input class="form-check-input" type="checkbox" role="switch" id="${id}" ${this.d.estado ? 'checked' : ''}>
            <label class="form-check-label" for="${id}">
              <span id="lbl_${this.d.id}">${this.d.estado ? 'Encendido' : 'Apagado'}</span>
            </label>
          </div>
        </div>
      </div>`;
    col.querySelector('input').addEventListener('change', e => this.onToggle(this.d.id, e.target.checked));
    return col;
  }
  static updateUI(id, estado) {
    const dot = document.getElementById('dot_' + id);
    const lbl = document.getElementById('lbl_' + id);
    const sw  = document.getElementById('sw_'  + id);
    if (dot) dot.className = 'status-dot ' + (estado ? 'status-on status-pulse' : 'status-off');
    if (lbl) lbl.textContent = estado ? 'Encendido' : 'Apagado';
    if (sw)  sw.checked = !!estado;
  }
}

class ControlPanel {
  constructor(api, bus) { this.api = api; this.bus = bus; }
  async loadDevices() {
    const grid = document.getElementById('dispGrid');
    grid.innerHTML = '';
    const list = await this.api.listDispositivos();
    list.forEach(d => grid.appendChild(new DeviceCard(d, (id, on) => this.toggle(id, on)).render()));
  }
  async toggle(id, on) {
    try { await this.api.setEstado(id, on ? 1 : 0); }
    catch (e) { showAlert(e.message, 'danger'); DeviceCard.updateUI(id, !on); }
  }
  async loadMovs() {
    const grid = document.getElementById('movGrid');
    const list = await this.api.listMovimientos();
    grid.innerHTML = list.map(m => `
      <div class="col-6 col-md-3">
        <button class="btn btn-outline-success w-100" data-mov="${m.id}">
          <i class="bi bi-play-fill"></i> ${m.nombre}
        </button>
      </div>`).join('');
    grid.querySelectorAll('[data-mov]').forEach(b => b.onclick = async () => {
      try {
        const r = await this.api.ejecutarMovimiento(+b.dataset.mov);
        showAlert(`Movimiento ${r.nombre} ejecutado` + (r.entregado_al_esp ? '' : ' (ESP no conectado)'),
                  r.entregado_al_esp ? 'success' : 'warning');
      } catch (e) { showAlert(e.message, 'danger'); }
    });
  }
  bind() {
    this.bus.addEventListener('estatus', ev => {
      DeviceCard.updateUI(ev.detail.dispositivo_id, ev.detail.estado);
    });
    this.bus.addEventListener('movimiento', ev => {
      showAlert(`<i class="bi bi-broadcast"></i> Movimiento ${ev.detail.nombre} (ID ${ev.detail.id})`, 'info');
    });
  }
}

const bus = new RealtimeBus();
const panel = new ControlPanel(api, bus);
panel.bind();
panel.loadDevices();
panel.loadMovs();
