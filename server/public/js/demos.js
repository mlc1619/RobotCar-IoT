// demos.js — CRUD + ejecución de demos (OOP)
Layout.render('demos');

class DemosManager {
  constructor(api, bus) {
    this.api = api;
    this.bus = bus;
    this.movimientos = [];
    this.modal = new bootstrap.Modal('#modalDemo');
  }

  async init() {
    this.movimientos = await this.api.listMovimientos();
    await this.loadDemos();
    this.bindRealtime();
  }

  async loadDemos() {
    const list = await this.api.listDemos();
    document.getElementById('grid').innerHTML = list.map(d => `
      <div class="col-md-6">
        <div class="card card-device shadow-sm h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between">
              <h5 class="card-title mb-1">${d.nombre}</h5>
              <span class="badge bg-warning text-dark">${d.pasos} pasos</span>
            </div>
            <p class="text-muted small mb-3">${d.descripcion || ''}</p>
            <button class="btn btn-success btn-sm me-1" data-run="${d.id}"><i class="bi bi-play-fill"></i> Ejecutar</button>
            <button class="btn btn-outline-primary btn-sm me-1" data-edit="${d.id}"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-outline-danger btn-sm" data-del="${d.id}"><i class="bi bi-trash"></i></button>
          </div>
        </div>
      </div>`).join('');
    document.querySelectorAll('[data-run]').forEach(b => b.onclick = () => this.run(+b.dataset.run));
    document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => this.openEdit(+b.dataset.edit));
    document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => this.remove(+b.dataset.del));
  }

  async run(id) {
    try {
      const r = await this.api.ejecutarDemo(id);
      showAlert(`Demo iniciada (${r.total} pasos)`, 'success');
    } catch (e) { showAlert(e.message, 'danger'); }
  }

  async remove(id) {
    if (!confirm('¿Eliminar la demo?')) return;
    try { await this.api.deleteDemo(id); showAlert('Eliminada', 'warning'); this.loadDemos(); }
    catch (e) { showAlert(e.message, 'danger'); }
  }

  openNew() {
    document.getElementById('demo_id').value = '';
    document.getElementById('demo_nombre').value = '';
    document.getElementById('demo_desc').value = '';
    document.querySelector('#tblPasos tbody').innerHTML = '';
    this.addPaso();
  }

  async openEdit(id) {
    const d = await this.api.getDemo(id);
    document.getElementById('demo_id').value = d.id;
    document.getElementById('demo_nombre').value = d.nombre;
    document.getElementById('demo_desc').value = d.descripcion || '';
    const tb = document.querySelector('#tblPasos tbody');
    tb.innerHTML = '';
    d.pasos.forEach(p => this.addPaso(p.movimiento_id, p.duracion_ms));
    this.modal.show();
  }

  addPaso(movId = 1, dur = 1000) {
    const tb = document.querySelector('#tblPasos tbody');
    const idx = tb.children.length + 1;
    const opts = this.movimientos.map(m =>
      `<option value="${m.id}" ${m.id === movId ? 'selected' : ''}>${m.id}. ${m.nombre}</option>`).join('');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="paso-num">${idx}</td>
      <td><select class="form-select form-select-sm paso-mov">${opts}</select></td>
      <td><input type="number" min="100" step="100" value="${dur}" class="form-control form-control-sm paso-dur"></td>
      <td><button type="button" class="btn btn-sm btn-outline-danger btn-quita"><i class="bi bi-x"></i></button></td>`;
    tr.querySelector('.btn-quita').onclick = () => { tr.remove(); this.renumerar(); };
    tb.appendChild(tr);
  }

  renumerar() {
    document.querySelectorAll('#tblPasos tbody tr').forEach((tr, i) => tr.querySelector('.paso-num').textContent = i + 1);
  }

  async save(ev) {
    ev.preventDefault();
    const id = document.getElementById('demo_id').value;
    const pasos = [...document.querySelectorAll('#tblPasos tbody tr')].map(tr => ({
      movimiento_id: +tr.querySelector('.paso-mov').value,
      duracion_ms:   +tr.querySelector('.paso-dur').value
    }));
    if (!pasos.length) return showAlert('Agrega al menos un paso', 'warning');
    const data = {
      nombre: document.getElementById('demo_nombre').value.trim(),
      descripcion: document.getElementById('demo_desc').value.trim(),
      pasos
    };
    try {
      if (id) await this.api.updateDemo(id, data); else await this.api.createDemo(data);
      showAlert(id ? 'Demo actualizada' : 'Demo creada', 'success');
      this.modal.hide(); this.loadDemos();
    } catch (e) { showAlert(e.message, 'danger'); }
  }

  bindRealtime() {
    const box = document.getElementById('estadoDemo');
    this.bus.addEventListener('demo', ev => {
      const d = ev.detail;
      if (d.estado === 'iniciada') {
        box.innerHTML = `<span class="badge bg-primary">Iniciada</span> Demo #${d.demoId} — ${d.total} pasos`;
      } else if (d.estado === 'paso') {
        const pct = Math.round((d.paso / d.total) * 100);
        box.innerHTML = `
          <strong>Paso ${d.paso}/${d.total}:</strong> ${d.movimiento}
          ${d.entregado_al_esp ? '' : '<span class="badge bg-warning text-dark ms-2">ESP no conectado</span>'}
          <div class="progress mt-2"><div class="progress-bar" style="width:${pct}%">${pct}%</div></div>`;
      } else if (d.estado === 'finalizada') {
        box.innerHTML = `<span class="badge bg-success">Finalizada</span> Demo #${d.demoId}`;
        showAlert('Demo finalizada', 'success');
      } else if (d.estado === 'abortada') {
        box.innerHTML = `<span class="badge bg-danger">Abortada</span> Demo #${d.demoId} (${d.motivo})`;
        showAlert('Demo abortada: ' + d.motivo, 'danger');
      }
    });
    this.bus.addEventListener('obstaculo', ev => {
      showAlert(`<i class="bi bi-exclamation-triangle-fill"></i> Obstáculo a ${(+ev.detail.distancia).toFixed(1)} cm`, 'danger');
    });
  }
}

const bus = new RealtimeBus();
const mgr = new DemosManager(api, bus);
document.getElementById('btnNueva').addEventListener('click', () => mgr.openNew());
document.getElementById('btnAddPaso').addEventListener('click', () => mgr.addPaso());
document.getElementById('formDemo').addEventListener('submit', e => mgr.save(e));
document.getElementById('btnCancelar').addEventListener('click', async () => {
  try { await api.cancelarDemo(); showAlert('Cancelada', 'warning'); }
  catch (e) { showAlert(e.message, 'danger'); }
});
mgr.init();
