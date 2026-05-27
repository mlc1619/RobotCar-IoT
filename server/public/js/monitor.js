// monitor.js — Dashboard de monitoreo (OOP, refresco 2s)
Layout.render('monitor');

const COLORS = ['#0d6efd', '#198754', '#dc3545', '#ffc107', '#0dcaf0', '#6610f2', '#fd7e14'];

class MonitorView {
  constructor(api, refreshMs = 2000) {
    this.api = api;
    this.refreshMs = refreshMs;
    this.chart = null;
    this.timer = null;
  }

  start() { this.tick(); this.timer = setInterval(() => this.tick(), this.refreshMs); }
  stop()  { clearInterval(this.timer); }

  async tick() {
    try {
      const data = await this.api.getMonitoreo();
      this.renderResumen(data);
      this.renderChart(data);
      this.renderTablas(data);
      await this.refreshObstaculos();
      await this.refreshHistorial();
    } catch (e) { console.error(e); }
  }

  async refreshHistorial() {
    const [movs, demos] = await Promise.all([
      this.api.historialMovimientos(10),
      this.api.historialDemos(10)
    ]);

    // Movimientos
    document.getElementById('h_mov_count').textContent = movs.length;
    document.getElementById('h_mov_tbl').innerHTML = movs.length === 0
      ? '<tr><td colspan="6" class="text-center text-muted">Sin movimientos ejecutados</td></tr>'
      : movs.map((m, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><span class="badge bg-secondary">${m.movimiento_id}</span></td>
          <td>${m.nombre}</td>
          <td><span class="badge ${m.origen === 'demo' ? 'bg-warning text-dark' : 'bg-info text-dark'}">${m.origen}</span></td>
          <td>${m.entregado_esp
            ? '<span class="badge bg-success">OK</span>'
            : '<span class="badge bg-danger">No</span>'}</td>
          <td><small>${new Date(m.fecha).toLocaleString()}</small></td>
        </tr>`).join('');

    // Demos
    document.getElementById('h_demo_count').textContent = demos.length;
    document.getElementById('h_demo_ultima').textContent = demos.length
      ? `${demos[0].nombre} — ${demos[0].estado} (${new Date(demos[0].inicio).toLocaleString()})`
      : 'Aún no se ha ejecutado ninguna demo';
    document.getElementById('h_demo_tbl').innerHTML = demos.length === 0
      ? '<tr><td colspan="5" class="text-center text-muted">Sin demos ejecutadas</td></tr>'
      : demos.map((d, i) => {
          const cls = d.estado === 'finalizada' ? 'bg-success'
                    : d.estado === 'abortada'   ? 'bg-danger'
                    : 'bg-warning text-dark';
          return `
            <tr>
              <td>${i + 1}</td>
              <td>${d.nombre}</td>
              <td>${d.pasos}</td>
              <td><span class="badge ${cls}">${d.estado}</span>${d.motivo ? `<br><small class="text-muted">${d.motivo}</small>` : ''}</td>
              <td><small>${new Date(d.inicio).toLocaleString()}</small></td>
            </tr>`;
        }).join('');
  }

  async refreshObstaculos() {
    const [list, stats] = await Promise.all([
      this.api.listObstaculos(10),
      this.api.obstaculoStats()
    ]);
    document.getElementById('o_total').textContent = stats.total;
    document.getElementById('o_hoy').textContent   = stats.hoy;
    document.getElementById('o_prom').textContent  = stats.distancia_promedio
      ? (+stats.distancia_promedio).toFixed(1) + ' cm' : '-';
    document.getElementById('o_ult').textContent   = stats.ultimo
      ? `${(+stats.ultimo.distancia).toFixed(1)} cm` : '-';
    document.getElementById('o_tabla').innerHTML = list.length === 0
      ? '<tr><td colspan="4" class="text-center text-muted">Sin obstáculos registrados</td></tr>'
      : list.map((o, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><span class="badge ${o.distancia < 15 ? 'bg-danger' : 'bg-warning text-dark'}">${(+o.distancia).toFixed(1)}</span></td>
          <td>${o.origen}</td>
          <td>${new Date(o.fecha).toLocaleString()}</td>
        </tr>`).join('');
  }

  renderResumen(data) {
    document.getElementById('resumen').innerHTML = data.map(d => `
      <div class="col-md-3 col-sm-6">
        <div class="card card-device shadow-sm h-100">
          <div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <h6 class="mb-1">${d.nombre}</h6>
              <small class="text-muted">${d.tipo}</small>
            </div>
            <div class="text-end">
              <span class="status-dot ${d.estado ? 'status-on status-pulse' : 'status-off'}"></span>
              <div><strong>${d.estado ? 'ON' : 'OFF'}</strong></div>
            </div>
          </div>
        </div>
      </div>`).join('');
  }

  renderChart(data) {
    // Eje X = índice de muestra (0..9, más reciente a la derecha); Y = 0/1
    const maxPts = 10;
    const labels = Array.from({ length: maxPts }, (_, i) => `t-${maxPts - 1 - i}`);
    const datasets = data.map((d, i) => {
      const series = d.historial.slice().reverse().map(h => h.estado);
      while (series.length < maxPts) series.unshift(null);
      return {
        label: d.nombre,
        data: series,
        borderColor: COLORS[i % COLORS.length],
        backgroundColor: COLORS[i % COLORS.length] + '33',
        stepped: true,
        tension: 0,
        spanGaps: true
      };
    });
    const cfg = {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        animation: false,
        scales: { y: { min: 0, max: 1, ticks: { stepSize: 1, callback: v => v ? 'ON' : 'OFF' } } },
        plugins: { legend: { position: 'bottom' } }
      }
    };
    if (this.chart) { this.chart.data = cfg.data; this.chart.update('none'); }
    else this.chart = new Chart(document.getElementById('chart'), cfg);
  }

  renderTablas(data) {
    document.getElementById('tablas').innerHTML = data.map(d => `
      <div class="card mb-3">
        <div class="card-header d-flex justify-content-between">
          <span><i class="bi bi-cpu"></i> <strong>${d.nombre}</strong>
            <span class="badge bg-secondary ms-2">${d.tipo}</span></span>
          <span><span class="status-dot ${d.estado ? 'status-on' : 'status-off'}"></span>
            ${d.estado ? 'ON' : 'OFF'}</span>
        </div>
        <div class="table-responsive">
          <table class="table table-sm table-historial mb-0">
            <thead class="table-light"><tr><th>#</th><th>Estado</th><th>Fecha</th></tr></thead>
            <tbody>
              ${d.historial.length === 0
                ? '<tr><td colspan="3" class="text-center text-muted">Sin registros</td></tr>'
                : d.historial.map((h, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td><span class="badge ${h.estado ? 'bg-success' : 'bg-secondary'}">${h.estado ? 'ON' : 'OFF'}</span></td>
                    <td>${new Date(h.fecha).toLocaleString()}</td>
                  </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`).join('');
  }
}

const view = new MonitorView(api, 2000);
view.start();

// Alerta en vivo de obstáculo por WebSocket
const bus = new RealtimeBus();
bus.addEventListener('obstaculo', ev => {
  const el = document.getElementById('alertaObst');
  el.innerHTML = `<span class="badge bg-warning text-dark">¡Alerta! ${(+ev.detail.distancia).toFixed(1)} cm</span>`;
  el.classList.add('status-pulse');
  setTimeout(() => el.classList.remove('status-pulse'), 3000);
  view.refreshObstaculos();
});

// Refresco inmediato de historial al recibir eventos
bus.addEventListener('movimiento', () => view.refreshHistorial());
bus.addEventListener('demo',       () => view.refreshHistorial());
