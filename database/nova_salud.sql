-- =====================================================================
--  Botica Nova Salud: inventario, lotes y ventas
--  Base de datos MySQL 8 / MariaDB 10.4+ (XAMPP)
--
--  Script sin inventario inicial (stock = 0 en todos los productos).
-- =====================================================================

DROP DATABASE IF EXISTS botica_nova_salud;
CREATE DATABASE botica_nova_salud CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE botica_nova_salud;

-- ---------------------------------------------------------------------
--  Usuarios: administrador y químico farmacéutico
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  email         VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol           ENUM('admin','farmaceutico') NOT NULL DEFAULT 'farmaceutico',
  activo        TINYINT(1) NOT NULL DEFAULT 1,
  creado_en     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
--  Catálogo
-- ---------------------------------------------------------------------
CREATE TABLE categorias (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE productos (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  nombre            VARCHAR(150) NOT NULL,
  descripcion       VARCHAR(255),
  imagen            VARCHAR(255),
  laboratorio       VARCHAR(100),
  presentacion      VARCHAR(80) NOT NULL DEFAULT '',
  categoria_id      INT,
  precio_compra     DECIMAL(10,2) NOT NULL DEFAULT 0,
  precio_venta      DECIMAL(10,2) NOT NULL,
  stock             INT NOT NULL DEFAULT 0,
  stock_minimo      INT NOT NULL DEFAULT 10,
  fecha_vencimiento DATE,
  requiere_receta   TINYINT(1) NOT NULL DEFAULT 0,
  activo            TINYINT(1) NOT NULL DEFAULT 1,
  creado_en         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_prod_cat  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
  CONSTRAINT chk_stock CHECK (stock >= 0),
  UNIQUE KEY uq_prod_nombre (nombre, presentacion)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
--  Lotes de cada producto (fabricación, caducidad y cantidades)
-- ---------------------------------------------------------------------
CREATE TABLE lote (
  id_lote             INT AUTO_INCREMENT PRIMARY KEY,
  codigo_lote         VARCHAR(50) NOT NULL,
  fecha_fabricacion   DATE NOT NULL,
  fecha_caducidad     DATE NOT NULL,
  cantidad_inicial    INT NOT NULL,
  cantidad_actual     INT NOT NULL,
  id_producto         INT NOT NULL,
  CONSTRAINT fk_lote_producto FOREIGN KEY (id_producto) REFERENCES productos(id) ON DELETE CASCADE,
  CONSTRAINT chk_lote_fechas   CHECK (fecha_caducidad > fecha_fabricacion),
  CONSTRAINT chk_lote_inicial  CHECK (cantidad_inicial > 0),
  CONSTRAINT chk_lote_actual   CHECK (cantidad_actual >= 0 AND cantidad_actual <= cantidad_inicial),
  UNIQUE KEY uq_lote_producto (id_producto, codigo_lote),
  INDEX idx_lote_caducidad (fecha_caducidad)
) ENGINE=InnoDB;

CREATE TABLE clientes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  dni        VARCHAR(11) NOT NULL UNIQUE,
  nombre     VARCHAR(120) NOT NULL,
  telefono   VARCHAR(20),
  email      VARCHAR(120),
  creado_en  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
--  Ventas (punto de venta)
-- ---------------------------------------------------------------------
CREATE TABLE ventas (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  numero         VARCHAR(20) UNIQUE,
  cliente_id     INT,
  usuario_id     INT NOT NULL,
  subtotal       DECIMAL(10,2) NOT NULL,
  igv            DECIMAL(10,2) NOT NULL,
  total          DECIMAL(10,2) NOT NULL,
  metodo_pago    ENUM('efectivo','tarjeta','yape_plin') NOT NULL DEFAULT 'efectivo',
  monto_recibido DECIMAL(10,2),
  vuelto         DECIMAL(10,2),
  estado         ENUM('completada','anulada') NOT NULL DEFAULT 'completada',
  creado_en      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_venta_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  CONSTRAINT fk_venta_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_venta_fecha (creado_en)
) ENGINE=InnoDB;

CREATE TABLE detalle_venta (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  venta_id        INT NOT NULL,
  producto_id     INT NOT NULL,
  cantidad        INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal        DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_det_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
  CONSTRAINT fk_det_prod  FOREIGN KEY (producto_id) REFERENCES productos(id),
  CONSTRAINT chk_cantidad CHECK (cantidad > 0)
) ENGINE=InnoDB;

-- Kardex: trazabilidad de todo cambio de stock
CREATE TABLE movimientos_inventario (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  producto_id    INT NOT NULL,
  tipo           ENUM('entrada','salida','ajuste','anulacion') NOT NULL,
  cantidad       INT NOT NULL,
  stock_anterior INT NOT NULL,
  stock_nuevo    INT NOT NULL,
  motivo         VARCHAR(255),
  venta_id       INT,
  usuario_id     INT,
  creado_en      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mov_prod    FOREIGN KEY (producto_id) REFERENCES productos(id),
  CONSTRAINT fk_mov_venta   FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE SET NULL,
  CONSTRAINT fk_mov_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_mov_fecha (creado_en)
) ENGINE=InnoDB;

-- =====================================================================
--  Datos iniciales
-- =====================================================================

INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
 ('Administrador',        'admin@novasalud.pe',        '$2a$10$VSBjPlQGf2VF0rCRzbuFiuHcIGueEo3IoZTtv/Lxv2OPtZd2CUtDy', 'admin'),
 ('Químico Farmacéutico', 'farmaceutico@novasalud.pe', '$2a$10$.jcHacWo37LOiMScFhg/b.5b6hQ9wwFjX5Y6AlHkeihbYjVjyqSo6', 'farmaceutico');

INSERT INTO categorias (nombre) VALUES
 ('Analgésicos'),('Antibióticos'),('Antigripales'),('Vitaminas y suplementos'),
 ('Cuidado personal'),('Gastrointestinales'),('Antialérgicos'),('Primeros auxilios');

-- Productos inicializados con stock en 0
INSERT INTO productos (nombre,laboratorio,presentacion,imagen,categoria_id,precio_compra,precio_venta,stock,stock_minimo,fecha_vencimiento,requiere_receta) VALUES
 ('Paracetamol 500 mg','Portugal','Caja x 100 tab','/uploads/productos/paracetamol-500-mg.png',1,8.00,15.00,0,30,DATE_ADD(CURDATE(), INTERVAL 18 MONTH),0),
 ('Ibuprofeno 400 mg','Medifarma','Caja x 100 tab','/uploads/productos/ibuprofeno-400-mg.png',1,12.00,22.00,0,20,DATE_ADD(CURDATE(), INTERVAL 12 MONTH),0),
 ('Amoxicilina 500 mg','Genfar','Caja x 100 cap','/uploads/productos/amoxicilina-500-mg.png',2,25.00,45.00,0,15,DATE_ADD(CURDATE(), INTERVAL 10 MONTH),1),
 ('Azitromicina 500 mg','Portugal','Caja x 3 tab','/uploads/productos/azitromicina-500-mg.png',2,6.50,14.00,0,10,DATE_ADD(CURDATE(), INTERVAL 20 DAY),1),
 ('Panadol Antigripal','GSK','Caja x 12 tab','/uploads/productos/panadol-antigripal.png',3,9.00,16.50,0,20,DATE_ADD(CURDATE(), INTERVAL 14 MONTH),0),
 ('Vitamina C 1g efervescente','Bayer','Tubo x 10','/uploads/productos/vitamina-c-1g-efervescente.png',4,10.00,18.90,0,10,DATE_ADD(CURDATE(), INTERVAL 24 MONTH),0),
 ('Complejo B','Hersil','Frasco x 100 tab','/uploads/productos/complejo-b.png',4,11.00,20.00,0,10,DATE_ADD(CURDATE(), INTERVAL 16 MONTH),0),
 ('Alcohol medicinal 70°','Alkofarma','Frasco 1 L','/uploads/productos/alcohol-medicinal-70.png',8,6.00,11.50,0,15,DATE_ADD(CURDATE(), INTERVAL 36 MONTH),0),
 ('Omeprazol 20 mg','Medifarma','Caja x 100 cap','/uploads/productos/omeprazol-20-mg.png',6,9.50,18.00,0,20,DATE_ADD(CURDATE(), INTERVAL 15 MONTH),0),
 ('Loratadina 10 mg','Genfar','Caja x 100 tab','/uploads/productos/loratadina-10-mg.png',7,7.00,13.00,0,15,DATE_ADD(CURDATE(), INTERVAL 9 MONTH),0),
 ('Gasa estéril 10x10','Cofarma','Sobre x 1','/uploads/productos/gasa-esteril-10x10.png',8,0.40,1.00,0,50,DATE_ADD(CURDATE(), INTERVAL 48 MONTH),0),
 ('Protector solar FPS 50','La Roche','Frasco 200 ml','/uploads/productos/protector-solar-fps-50.png',5,45.00,79.90,0,5,DATE_ADD(CURDATE(), INTERVAL 22 MONTH),0),
 ('Sales de rehidratación oral','Farmindustria','Sobre x 1','/uploads/productos/sales-de-rehidratacion-oral.png',6,0.80,2.00,0,30,DATE_ADD(CURDATE(), INTERVAL 11 MONTH),0),
 ('Clorfenamina 4 mg','Portugal','Caja x 100 tab','/uploads/productos/clorfenamina-4-mg.png',7,4.00,8.00,0,20,DATE_SUB(CURDATE(), INTERVAL 5 DAY),0),
 ('Jarabe para la tos Ambroxol','Medifarma','Frasco 120 ml','/uploads/productos/jarabe-para-la-tos-ambroxol.png',3,5.50,12.50,0,10,DATE_ADD(CURDATE(), INTERVAL 7 MONTH),0);

-- Se eliminó la inserción automática en movimientos_inventario para dejar el kardex limpio.

INSERT INTO clientes (dni,nombre,telefono,email) VALUES
 ('00000000','Cliente varios',NULL,NULL),
 ('45678912','María López Quispe','987654321','maria.lopez@mail.com'),
 ('70123456','Carlos Ramírez Torres','912345678',NULL),
 ('41234567','Rosa Huamán Flores','956789123','rosa.hf@mail.com');
