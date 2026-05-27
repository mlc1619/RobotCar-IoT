-- Migración: demos (rutinas de movimientos) + alertas de obstáculos
USE robotcar;

-- =====================  DEMOS  =====================
CREATE TABLE IF NOT EXISTS demos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(80)  NOT NULL UNIQUE,
  descripcion VARCHAR(200) DEFAULT NULL,
  creado_en   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS demo_pasos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  demo_id       INT NOT NULL,
  orden         INT NOT NULL,
  movimiento_id INT NOT NULL,
  duracion_ms   INT NOT NULL DEFAULT 1000,
  CONSTRAINT fk_paso_demo FOREIGN KEY (demo_id) REFERENCES demos(id) ON DELETE CASCADE,
  CONSTRAINT fk_paso_mov  FOREIGN KEY (movimiento_id) REFERENCES movimientos(id),
  UNIQUE KEY uniq_demo_orden (demo_id, orden)
);

-- 3 demos precargadas
INSERT INTO demos (id, nombre, descripcion) VALUES
  (1, 'Recorrido cuadrado',  'Avanza, gira 90° derecha, repite 4 veces formando un cuadrado'),
  (2, 'Slalom corto',        'Adelante, vuelta derecha, adelante, vuelta izquierda, adelante'),
  (3, 'Giro completo + ida', 'Adelante 2s, giro 360° derecha, adelante 2s, giro 360° izq y detener')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- Pasos: (demo_id, orden, movimiento_id, duracion_ms)
-- Movimientos de referencia: 1=Adelante, 2=Atras, 3=Detener,
--   4=Vuelta D adelante, 5=Vuelta I adelante,
--   8=Giro 90 D, 9=Giro 90 I, 10=Giro 360 D, 11=Giro 360 I
INSERT INTO demo_pasos (demo_id, orden, movimiento_id, duracion_ms) VALUES
  -- Demo 1: cuadrado
  (1, 1, 1, 2000), (1, 2, 8, 700),
  (1, 3, 1, 2000), (1, 4, 8, 700),
  (1, 5, 1, 2000), (1, 6, 8, 700),
  (1, 7, 1, 2000), (1, 8, 3, 500),
  -- Demo 2: slalom
  (2, 1, 1, 1500), (2, 2, 4, 900),
  (2, 3, 1, 1500), (2, 4, 5, 900),
  (2, 5, 1, 1500), (2, 6, 3, 500),
  -- Demo 3: giros
  (3, 1, 1, 2000), (3, 2, 10, 2200),
  (3, 3, 1, 2000), (3, 4, 11, 2200),
  (3, 5, 3, 500)
ON DUPLICATE KEY UPDATE duracion_ms = VALUES(duracion_ms);

-- =====================  OBSTÁCULOS  =====================
CREATE TABLE IF NOT EXISTS obstaculos (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  distancia   DECIMAL(6,2) NOT NULL,     -- cm
  origen      VARCHAR(20)  NOT NULL DEFAULT 'esp',
  fecha       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_obstaculos_fecha ON obstaculos (fecha DESC);
