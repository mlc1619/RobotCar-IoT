-- Base de datos
CREATE DATABASE IF NOT EXISTS robotcar
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE robotcar;

-- Tabla de parámetros (Velocidad, factores)
CREATE TABLE IF NOT EXISTS parametros (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  factor       VARCHAR(50) NOT NULL UNIQUE,
  valor        DECIMAL(10,2) NOT NULL
);

INSERT INTO parametros (factor, valor) VALUES
  ('Velocidad',       255),
  ('Factor vuelta',   0.75),
  ('Factor tiempo',   1000),
  ('Factor giro 90',  500),
  ('Factor giro 360', 2000)
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

-- Tabla de movimientos (exactamente la del Excel)
CREATE TABLE IF NOT EXISTS movimientos (
  id          INT PRIMARY KEY,
  nombre      VARCHAR(60) NOT NULL,
  a_input_1a  SMALLINT NOT NULL,   -- 0..255  (LOW = 0)
  a_input_1b  SMALLINT NOT NULL,
  a_tiempo    INT NOT NULL,        -- ms
  b_input_1a  SMALLINT NOT NULL,
  b_input_1b  SMALLINT NOT NULL,
  b_tiempo    INT NOT NULL
);

INSERT INTO movimientos (id, nombre, a_input_1a, a_input_1b, a_tiempo, b_input_1a, b_input_1b, b_tiempo) VALUES
  (1,  'Adelante',                0, 255, 0,    255, 0,   0),
  (2,  'Atras',                   255, 0, 0,    0,   255, 0),
  (3,  'Detener',                 0,   0, 0,    0,   0,   0),
  (4,  'Vuelta derecha adelante', 0, 255, 1000, 191, 0,   1000),
  (5,  'Vuelta izquierda adelante', 0, 191, 1000, 255, 0, 1000),
  (6,  'Vuelta derecha atras',    255, 0, 1000, 0,   191, 1000),
  (7,  'Vuelta izquierda atras',  191, 0, 1000, 0,   255, 1000),
  (8,  'Giro 90 derecha',         0, 255, 500,  0,   255, 500),
  (9,  'Giro 90 izquierda',       255, 0, 500,  255, 0,   500),
  (10, 'Giro 360 derecha',        0, 255, 2000, 0,   255, 2000),
  (11, 'Giro 360 izquierda',      255, 0, 2000, 255, 0,   2000)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);
