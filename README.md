# rrhh-web

Frontend administrativo de RRHH para consumo de `rrhh-api`.

## 1. Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router

## 2. Requisitos

- Node.js 20+
- Yarn 1.x
- API `rrhh-api` activa

## 3. Variables de entorno

Archivo: `.env`

```env
VITE_API_URL=http://127.0.0.1:30045/api
```

## 4. Instalación y ejecución

```bash
yarn install
yarn dev
```

Scripts:

```bash
yarn build
yarn lint
```

## 5. Modo multi-tenant en frontend

## 5.1 Tenant activo

- Se guarda en `localStorage`.
- Se selecciona desde login o desde `Ajustes`.

## 5.2 Header automático

Todas las llamadas al backend envían:

```http
x-tenant: <slug-tenant-activo>
```

## 5.3 Auth

- Login devuelve JWT.
- JWT se guarda en `localStorage`.
- Requests autenticadas usan `Authorization: Bearer <token>`.

## 6. Pantallas principales

- Dashboard
- Empleados
- Nómina
- Préstamos
- Ajustes

## 6.1 Ajustes de tenant

En la pantalla de `Ajustes`:

- Selección de tenant activo.
- Creación de tenant (sin eliminación).
- Campos para crear tenant:
  - Nombre
  - Razón social
  - NIT
  - Slug (opcional)

## 7. Integración con PDF multi-tenant

Desde la web, al solicitar PDF de nómina:

- se envía `x-tenant` actual,
- la API responde PDF con:
  - logo del tenant,
  - razón social y NIT del tenant.

## 8. Flujo de validación funcional (QA)

1. Iniciar sesión.
2. Seleccionar tenant `amaya`.
3. Crear/consultar empleado.
4. Cambiar tenant a `amovil`.
5. Validar que no se mezclan datos de `amaya`.
6. Descargar un PDF de nómina en cada tenant.
7. Confirmar encabezado:
   - `amaya`: AMAYA SOLUCIONES SAS / NIT 901423712-1
   - `amovil`: ASISTENCIA MOVIL SAS / NIT 900464969-7

## 9. Troubleshooting

- Errores `400 Debes enviar el header x-tenant`
  - Verifica tenant activo en la sesión.
  - Revisa que no haya llamadas fetch fuera de `src/api/client.ts`.

- `HTTP 401` / sesión vencida
  - Iniciar sesión de nuevo.

- No carga datos en tablas
  - Verifica `VITE_API_URL`.
  - Verifica API activa y CORS.

- PDF no corresponde al tenant
  - Confirmar tenant activo en `Ajustes` antes de descargar.
