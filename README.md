# Sistema de Indumentaria

Punto de venta **local** para una casa de indumentaria. Hecho con Electron + React + SQLite.
No necesita servidor ni conexión a internet: los datos se guardan en la propia computadora.

> Está basado en un sistema de stock con Supabase, adaptado a indumentaria y a un entorno 100% local.

## Módulos

- **Inicio**: resumen (productos, unidades, valor de inventario, ganancia estimada, stock bajo, ventas de hoy y del mes).
- **Productos**: alta, edición y baja con marca, tipo, proveedor, **talle**, **color**, stock, precio de venta/compra e imagen.
- **Ventas**: carrito, medio de pago con interés, cliente opcional, historial, edición y eliminación (el stock se ajusta solo).
- **Clientes**: alta, edición y baja con teléfono, email y documento.
- **Proveedores**: alta, edición y baja con contacto, dirección y notas.
- **Contaduría**: facturación, ganancia y margen por semana, mes o año.
- **Configuración**: gestión de usuarios y cambio de contraseña.

Sin presupuestos, sin "mano de obra", sin autos y sin facturación AFIP/ARCA.

## Requisitos

- Node.js 20 o superior
- Windows (pensado para correr en Windows)

## Puesta en marcha

```sh
npm install
```

`postinstall` recompila `better-sqlite3` para la versión de Electron. Si alguna vez falla,
ejecutar:

```sh
npm run rebuild
```

## Desarrollo

```sh
npm run dev
```

Abre la ventana de Electron con el backend local ya levantado.

## Build y empaquetado

```sh
npm run build      # compila main, preload y renderer
npm run package:win  # genera el instalador en ./release
```

El instalador queda en `release\Sistema Indumentaria Setup 1.0.0.exe` (y además la carpeta
`release\win-unpacked`, que es la app ya descomprimida).

> **Windows y el build del instalador:** `electron-builder` descarga unas herramientas de
> firma (`winCodeSign`) que contienen enlaces simbólicos de macOS, y Windows no puede
> extraerlos sin el "Modo desarrollador". Si al compilar aparece el error
> *"Cannot create symbolic link"*, hay dos salidas:
> 1. Activar **Modo desarrollador** (Configuración → Sistema → Para desarrolladores) y reintentar.
> 2. O copiar la carpeta ya extraída a la caché para que no la vuelva a descargar:
>    ```
>    # origen (una de las carpetas con número que quedaron en la caché)
>    %LOCALAPPDATA%\electron-builder\Cache\winCodeSign\<numero>
>    # destino
>    %LOCALAPPDATA%\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0
>    ```
> En esta máquina ya quedó aplicada la opción 2, así que `npm run package:win` funciona directo.

## Datos del cliente

La base SQLite se crea en `C:\Users\<usuario>\AppData\Roaming\Sistema Indumentaria\indumentaria.db`.
Para resguardar la información del cliente, copiar ese archivo (con la app cerrada).

## Usuario inicial

- Usuario: `admin`
- Contraseña: `admin123`

Se puede cambiar desde **Configuración**.

## Cómo funciona

- **Electron** (`src/main`) levanta un servidor Express en `127.0.0.1` (puerto aleatorio) y
  carga la app React desde ahí mismo. En modo desarrollo carga el servidor de Vite.
- **SQLite** (`better-sqlite3`) guarda todo en `indumentaria.db` dentro de la carpeta de
  datos del usuario (`app.getPath('userData')`). La primera vez se crean las tablas y
  datos iniciales (tipos, medios de pago y usuario admin).
- La autenticación es local: la contraseña se guarda hasheada (scrypt) y la sesión usa un
  token temporal en memoria.

## Estructura

```
src/
  main/        proceso de Electron + servidor Express + base SQLite
  preload/     puente seguro hacia el proceso principal
  renderer/    aplicación React (Vite + Tailwind)
```
