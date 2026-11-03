# 💊 Nova Salud | Sistema de Inventario y Ventas para Botica

Sistema web fullstack desarrollado para optimizar la gestión administrativa, el control de inventario y las ventas de una botica.

La aplicación integra un punto de venta (POS), control de stock en tiempo real, gestión de lotes, alertas de vencimiento, historial de movimientos (Kardex), administración de clientes y reportes mediante un panel de control.

## 🛠️ Tecnologías utilizadas

| Componente | Tecnología |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Base de datos | MySQL |
| Comunicación en tiempo real | Socket.IO |
| Autenticación | JWT + bcrypt |
| Seguridad | Helmet, Express Rate Limit |
| API | REST |
| Control de versiones | Git + GitHub |

## 📁 Estructura del proyecto

```text
NOVA/
├── database/
│   ├── schema.sql
│   └── seed.sql
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   ├── middleware/
│   │   ├── controllers/
│   │   ├── routes/
│   │   │   └── index.js
│   │   ├── db/
│   │   │   └── init.js
│   │   └── server.js
│   └── uploads/
│       └── productos/
│
├── frontend/
│   └── src/
│       ├── pages/
│       ├── components/
│       └── context/
│           └── AuthContext.jsx
│
├── docs/
│   └── PROPUESTA.md
│
├── package.json
└── README.md
```

### Descripción de los directorios

- **database/**: scripts SQL para crear las tablas e insertar datos de ejemplo.
- **backend/**: servidor Express, API REST, autenticación, reglas de negocio y conexión con MySQL.
- **frontend/**: interfaz web desarrollada con React y Vite.
- **docs/**: documentación técnica y propuesta del proyecto.

La propuesta, las respuestas a las preguntas guía y los diagramas se encuentran en [docs/PROPUESTA.md](docs/PROPUESTA.md).

## ⚙️ Requisitos previos

Antes de ejecutar el proyecto, es necesario contar con:

- Node.js 18 o superior.
- npm.
- MySQL 8 o una versión compatible de MariaDB.
- XAMPP o MySQL Server.
- Git (opcional, para clonar el repositorio).

## 🚀 Instalación y ejecución

### 1. Obtener el proyecto

Si el proyecto está alojado en GitHub, clonar el repositorio:

```bash
git clone https://github.com/ArnoldZamoratec/nova-salud-gestion-botica.git
```

Ingresar al directorio:

```bash
cd nova-salud-gestion
```

### 2. Iniciar MySQL

**Opción A: XAMPP**

1. Abrir XAMPP Control Panel.
2. Localizar el servicio MySQL.
3. Presionar **Start**.
4. Verificar que el servicio esté funcionando.

En una instalación local predeterminada de XAMPP, el usuario suele ser `root` sin contraseña.

**Opción B: MySQL Server**

Abrir PowerShell como administrador y ejecutar:

```powershell
net start MySQL80
```

> Importante: XAMPP y MySQL Server no deben utilizar simultáneamente el mismo puerto 3306.

### 3. Configurar variables de entorno

Configurar el backend con los parámetros correspondientes a la instalación local de MySQL.

Ejemplo de variables:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=botica_nova_salud

JWT_SECRET=reemplazar_por_una_clave_segura
```

Los nombres exactos de las variables deben coincidir con los utilizados por el backend.

**Seguridad:** nunca subir archivos `.env` con credenciales reales al repositorio.

### 4. Ejecutar la aplicación

Desde la carpeta raíz:

```bash
npm run dev
```

También se puede utilizar:

```bash
npm start
```

El script de inicio prepara las dependencias necesarias, comprueba el servicio MySQL según la configuración del proyecto y ejecuta backend y frontend.

Para detener los servidores:

```text
Ctrl + C
```

Esto detiene los procesos de Node.js, pero no necesariamente el servicio MySQL.

## 🌐 Acceso a la aplicación

| Módulo | Dirección |
|---|---|
| Catálogo público | http://localhost:5173/ |
| Inicio de sesión | http://localhost:5173/login |
| Panel administrativo | http://localhost:5173/admin |

El catálogo público permite consultar productos, precios y disponibilidad.

El panel administrativo está destinado al personal autorizado.

## 👥 Usuarios de prueba

Credenciales destinadas exclusivamente al entorno de desarrollo.

| Rol | Correo electrónico | Contraseña |
|---|---|---|
| Administrador | admin@novasalud.pe | Admin123* |
| Químico farmacéutico | farmaceutico@novasalud.pe | Farma123* |

> Estas credenciales deben cambiarse o deshabilitarse antes de publicar la aplicación en producción.

## ✨ Funcionalidades principales

### 1. Dashboard administrativo

Panel de control para visualizar información relevante de la botica:

- Resumen de ventas.
- Estado general del inventario.
- Productos con stock bajo.
- Productos próximos a vencer.
- Indicadores operativos.

### 2. Gestión de productos

Permite administrar el catálogo de medicamentos y otros productos.

- Registrar productos.
- Editar información.
- Eliminar productos según los permisos disponibles.
- Asignar categorías.
- Administrar precios.
- Consultar existencias.
- Subir imágenes JPG, PNG o WebP de hasta 2 MB.

Las imágenes se almacenan en:

```text
backend/uploads/productos/
```

### 3. Punto de venta (POS)

Módulo para registrar las ventas de la botica.

**Características:**

- Búsqueda de productos por nombre.
- Agregar productos mediante la tecla Enter.
- Selección de clientes por DNI.
- Cálculo de importes e IGV.
- Registro de pagos en efectivo, tarjeta, Yape o Plin.
- Cálculo automático del vuelto.
- Generación de boletas imprimibles.

**Atajos de teclado:**

| Tecla | Función |
|---|---|
| F2 | Buscar productos |
| F9 | Cobrar |
| Enter | Agregar producto seleccionado |

### 4. Control de inventario en tiempo real

El sistema utiliza Socket.IO para sincronizar los cambios de inventario entre las sesiones conectadas.

Cuando se registra una venta o un ingreso de mercadería, el stock se actualiza automáticamente en las pantallas abiertas.

### 5. Gestión de lotes y vencimientos

Cada ingreso de mercadería permite registrar:

- Código del lote.
- Fecha de fabricación.
- Fecha de vencimiento.
- Cantidad inicial.
- Cantidad disponible.

El sistema utiliza el método **FEFO (First Expired, First Out)**, que prioriza la salida de los lotes con vencimiento más próximo.

Además:

- Impide vender unidades de lotes vencidos.
- Permite registrar bajas de lotes.
- Actualiza la fecha de vencimiento más próxima del producto.

### 6. Sistema de alertas

Genera alertas relacionadas con el inventario:

- Productos agotados.
- Productos con stock bajo.
- Productos próximos a vencer.
- Productos vencidos.
- Cantidades sugeridas para reposición.

También permite exportar información en formato CSV.

### 7. Kardex de inventario

Registra los movimientos de productos para facilitar su trazabilidad.

Incluye:

- Entradas de mercadería.
- Salidas por ventas.
- Ajustes de inventario.
- Anulaciones.
- Devoluciones de stock.

### 8. Gestión de ventas

Permite consultar y administrar las operaciones realizadas.

- Historial de ventas.
- Detalles de cada operación.
- Reimpresión de comprobantes.
- Anulación de ventas por administradores.
- Reposición de existencias al anular una venta.

### 9. Gestión de clientes

Permite registrar, consultar y actualizar la información de los clientes de la botica.

### 10. Gestión de usuarios y roles

El sistema contempla dos roles principales:

| Rol | Permisos |
|---|---|
| Administrador | Administración de productos, usuarios, inventario y ventas |
| Químico farmacéutico | Operaciones autorizadas de venta y consulta |

Los permisos se validan en el backend.

## 🔐 Seguridad

El sistema incorpora mecanismos de protección:

- Autenticación mediante JSON Web Tokens (JWT).
- Contraseñas cifradas mediante hash con bcrypt.
- Autorización basada en roles.
- Validación de permisos en el servidor.
- Consultas SQL parametrizadas.
- Helmet para configurar cabeceras HTTP de seguridad.
- Limitación de intentos de inicio de sesión.
- Autenticación de conexiones Socket.IO.
- Transacciones de base de datos con bloqueo de filas.

Estas medidas deben complementarse con una configuración segura del servidor y de la base de datos.

## 🔌 API REST

Principales endpoints disponibles:

| Método | Endpoint | Acceso |
|---|---|---|
| POST | `/api/auth/login` | Público |
| GET | `/api/productos` | Consulta |
| GET | `/api/productos/buscar?q=` | Consulta |
| POST / PUT / DELETE | `/api/productos` | Administrador |
| POST | `/api/productos/:id/stock` | Administrador |
| GET | `/api/movimientos` | Personal autorizado |
| GET | `/api/lotes` | Personal autorizado |
| POST | `/api/lotes/:id/baja` | Administrador |
| POST | `/api/ventas` | Personal autorizado |
| GET | `/api/ventas` | Personal autorizado |
| GET | `/api/ventas/:id` | Personal autorizado |
| POST | `/api/ventas/:id/anular` | Administrador |
| GET | `/api/alertas` | Personal autorizado |
| GET | `/api/dashboard` | Personal autorizado |
| GET / POST / PUT | `/api/clientes` | Personal autorizado |
| GET / POST / PATCH | `/api/usuarios` | Administrador |

El químico farmacéutico solo puede consultar las ventas que le corresponden, de acuerdo con las reglas de autorización del backend.

## 🗄️ Base de datos

El sistema utiliza MySQL como motor de base de datos relacional.

Los scripts se encuentran en:

```text
database/
├── schema.sql
└── seed.sql
```

- `schema.sql`: contiene la estructura de tablas, claves primarias, claves foráneas y relaciones.
- `seed.sql`: contiene los datos iniciales o de ejemplo.

La base de datos utilizada por el proyecto se denomina:

```sql
botica_nova_salud
```

Se emplean tablas relacionadas para mantener la integridad de los datos y facilitar el seguimiento de las operaciones.

## 📦 Compilación para producción

Para generar la versión optimizada del frontend:

```bash
cd frontend
npm run build
```

La compilación se genera en:

```text
frontend/dist/
```

Para desplegar el sistema en un servidor se recomienda:

1. Configurar Node.js y MySQL.
2. Utilizar variables de entorno seguras.
3. Ejecutar el backend mediante PM2.
4. Servir el frontend compilado mediante Nginx.
5. Configurar un proxy inverso para `/api` y `/socket.io`.
6. Habilitar HTTPS.
7. Configurar copias de seguridad periódicas.
8. Cambiar las credenciales de prueba.

## 📚 Documentación

La documentación complementaria del proyecto está disponible en:

[Ver propuesta y documentación técnica](docs/PROPUESTA.md)

## 🎯 Objetivo del proyecto

Desarrollar una solución tecnológica que permita mejorar la eficiencia operativa de una botica mediante la automatización de procesos de inventario, ventas y administración.

Nova Salud busca reducir los errores manuales, facilitar la trazabilidad de los medicamentos y proporcionar información actualizada para apoyar la toma de decisiones.

---

**Nova Salud** — Sistema de gestión de inventario y ventas para botica.

Desarrollado con React, Node.js, Express y MySQL.
