-- Migración: dispositivos IoT + historial de estatus
USE robotcar;

CREATE TABLE IF NOT EXISTS dispositivos (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(60)  NOT NULL UNIQUE,
  tipo         VARCHAR(30)  NOT NULL,        -- carrito, led, sensor, motor, etc.
  pin          VARCHAR(10)  DEFAULT NULL,    -- pin GPIO opcional
  descripcion  VARCHAR(160) DEFAULT NULL,
  estado       TINYINT(1)   NOT NULL DEFAULT 0,   -- 0 = OFF, 1 = ON
  creado_en    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estatus_log (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  dispositivo_id  INT NOT NULL,
  estado          TINYINT(1) NOT NULL,
  fecha           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_estatus_dispositivo FOREIGN KEY (dispositivo_id)
    REFERENCES dispositivos(id) ON DELETE CASCADE
);

CREATE INDEX idx_estatus_disp_fecha ON estatus_log (dispositivo_id, fecha DESC);

-- Semilla con el carrito + un par de dispositivos de ejemplo
INSERT INTO dispositivos (nombre, tipo, pin, descripcion, estado) VALUES
  ('Carrito ESP8266', 'carrito', 'D5-D6', 'Robot car con driver L9110S', 0),
  ('LED frontal',     'led',     'D1',    'LED indicador frontal del carrito', 0),
  ('Buzzer',          'buzzer',  'D8',    'Buzzer de alerta', 0)
ON DUPLICATE KEY UPDATE tipo = VALUES(tipo);
