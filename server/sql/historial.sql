-- =====================================================================
-- Historial de ejecuciones (últimos movimientos y demos)
-- Ejecutar: mysql -u root -p robotcar < historial.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS movimientos_log (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  movimiento_id INT NOT NULL,
  nombre        VARCHAR(80) NOT NULL,
  origen        VARCHAR(30) DEFAULT 'manual',   -- manual | demo | api
  entregado_esp TINYINT(1) DEFAULT 0,
  fecha         DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mov_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS demos_log (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  demo_id   INT NOT NULL,
  nombre    VARCHAR(80) NOT NULL,
  pasos     INT DEFAULT 0,
  estado    ENUM('iniciada','finalizada','abortada') DEFAULT 'iniciada',
  motivo    VARCHAR(80) DEFAULT NULL,
  inicio    DATETIME DEFAULT CURRENT_TIMESTAMP,
  fin       DATETIME DEFAULT NULL,
  INDEX idx_demo_inicio (inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
