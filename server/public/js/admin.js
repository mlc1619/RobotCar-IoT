// admin.js — CRUD dispositivos + parámetros (OOP)
Layout.render('admin');

class AdminDispositivos {
  constructor(api) { this.api = api; this.modal = new bootstrap.Modal('#modalDisp'); }
  async load() {
    const list = await this.api.listDispositivos();
    const tb = document.getElementById('tblDisp');
    tb.innerHTML = list.map(d => `
      <tr>
        <td>${d.id}</td>
        <td>${d.nombre}</td>
        <td><span class="badge bg-info badge-tipo">${d.tipo}</span></td>
        <td>${d.pin || '-'}</td>
        <td>${d.descripcion || ''}</td>
        <td><span class="status-dot ${d.estado ? 'status-on' : 'status-off'}"></span>
            ${d.estado ? 'ON' : 'OFF'}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary" data-edit="${d.id}"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger"  data-del="${d.id}"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('');
    tb.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => this.openEdit(+b.dataset.edit));
    tb.querySelectorAll('[data-del]').forEach(b => b.onclick = () => this.remove(+b.dataset.del));
  }
  reset() {
    ['d_id','d_nombre','d_pin','d_desc'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('d_tipo').value = 'carrito';
  }
  async openEdit(id) {
    const d = await this.api.getDispositivo(id);
    document.getElementById('d_id').value     = d.id;
    document.getElementById('d_nombre').value = d.nombre;
    document.getElementById('d_tipo').value   = d.tipo;
    document.getElementById('d_pin').value    = d.pin || '';
    document.getElementById('d_desc').value   = d.descripcion || '';
    this.modal.show();
  }
  async save(ev) {
    ev.preventDefault();
    const id   = document.getElementById('d_id').value;
    const data = {
      nombre: document.getElementById('d_nombre').value.trim(),
      tipo:   document.getElementById('d_tipo').value,
      pin:    document.getElementById('d_pin').value.trim(),
      descripcion: document.getElementById('d_desc').value.trim()
    };
    try {
      if (id) await this.api.updateDispositivo(id, data);
      else    await this.api.createDispositivo(data);
      showAlert(id ? 'Dispositivo actualizado' : 'Dispositivo creado', 'success');
      this.modal.hide(); this.reset(); this.load();
    } catch (e) { showAlert(e.message, 'danger'); }
  }
  async remove(id) {
    if (!confirm('¿Eliminar el dispositivo #' + id + '?')) return;
    try { await this.api.deleteDispositivo(id); showAlert('Eliminado', 'warning'); this.load(); }
    catch (e) { showAlert(e.message, 'danger'); }
  }
}

class AdminParametros {
  constructor(api) { this.api = api; this.modal = new bootstrap.Modal('#modalParam'); }
  async load() {
    const list = await this.api.listParametros();
    document.getElementById('tblParam').innerHTML = list.map(p => `
      <tr>
        <td><strong>${p.factor}</strong></td>
        <td>
          <input type="number" step="0.01" class="form-control form-control-sm" style="max-width:140px"
                 value="${p.valor}" data-factor="${p.factor}">
        </td>
        <td class="text-end">
          <button class="btn btn-sm btn-success" data-save="${p.factor}"><i class="bi bi-save"></i></button>
          <button class="btn btn-sm btn-outline-danger" data-del="${p.factor}"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('');
    document.querySelectorAll('[data-save]').forEach(b => b.onclick = async () => {
      const factor = b.dataset.save;
      const valor  = +document.querySelector(`[data-factor="${factor}"]`).value;
      try { await this.api.setParametro(factor, valor); showAlert(`${factor} = ${valor}`, 'success'); }
      catch (e) { showAlert(e.message, 'danger'); }
    });
    document.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      if (!confirm('Eliminar parámetro ' + b.dataset.del + '?')) return;
      try { await this.api.deleteParametro(b.dataset.del); showAlert('Eliminado', 'warning'); this.load(); }
      catch (e) { showAlert(e.message, 'danger'); }
    });
  }
  async create(ev) {
    ev.preventDefault();
    const factor = document.getElementById('p_factor').value.trim();
    const valor  = +document.getElementById('p_valor').value;
    try { await this.api.createParametro(factor, valor); showAlert('Creado', 'success');
          this.modal.hide(); this.load(); }
    catch (e) { showAlert(e.message, 'danger'); }
  }
}

const adminD = new AdminDispositivos(api);
const adminP = new AdminParametros(api);
document.getElementById('btnNuevoDisp').addEventListener('click', () => adminD.reset());
document.getElementById('formDisp').addEventListener('submit',  e => adminD.save(e));
document.getElementById('formParam').addEventListener('submit', e => adminP.create(e));
adminD.load(); adminP.load();
