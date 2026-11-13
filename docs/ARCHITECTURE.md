# Arquitectura de Nexora

## Componentes
```text
Navegador — React 19 / TypeScript / Vite
           |
           | /api (proxy local; Bearer JWT)
           v
ASP.NET Core 10 — Endpoints REST
           | JWT, roles, rate limit
           v
Servicios de identidad y tareas — reglas de dominio
           |
           v
EF Core 10 — SQL Server 2022+
           | tablas
           +-- Organizations, Accounts
           +-- Projects, WorkItems
           +-- AuditEvents, OutboxMessages
           +-- IdempotencyRecords
```

## Límites entre organizaciones
Todas las rutas que consultan proyectos, tareas, usuarios y auditoría filtran por `OrganizationId` del token validado. La creación de tareas verifica que el proyecto y asignado pertenezcan a la misma organización. Las rutas sensibles de creación de miembros y proyectos usan política `Owner`.

## Control de concurrencia
`Revision` es token de concurrencia optimista. Cada cambio de estado o asignación exige `ExpectedRevision`. Respuestas 409 indican escritura con una versión antigua. En producción se recomiendan además tests de concurrencia sobre SQL Server real.

## Idempotencia
`Idempotency-Key` se exige para crear tareas. Se guarda una huella SHA-256 del payload junto al identificador del recurso. Reintentar la misma solicitud devuelve la tarea existente. Reutilizar la clave con otro payload devuelve 409.

## Auditoría y outbox
Crear, asignar y cambiar estado agrega un registro de auditoría y un mensaje outbox en la misma unidad `SaveChanges`. El outbox queda **pendiente**: no hay publicador, reintentos de entrega ni broker; el código NO afirma procesamiento de eventos extremo a extremo.

## Autenticación
Las contraseñas se almacenan con `PasswordHasher<Account>`, no en texto plano. JWT firmados con clave de entorno, expiración de 2 horas y validación de audiencia/emisor. React conserva el token **solo en memoria**, sin localStorage. La expiración obliga a iniciar sesión de nuevo. Antes de producción faltan revocación, recuperación segura de cuenta, MFA, control más estricto de intentos, gestión de sesiones y protección de endpoints públicos.

## Evolución de arquitectura
La separación `Domain` / `Services` / `Endpoints` / `Persistence` es modular pero **no debe describirse como Clean Architecture completa**: todo vive en un proyecto .NET. Para aplicar arquitectura hexagonal/Onion estricta se requieren ensamblados separados, inversión de dependencias, puertos y adaptadores.

## Qué no incluye
No hay Azure DevOps, TFS, VB.NET, SOAP, SSRS, Blazor, gRPC, Syncfusion, benchmarks SQL documentados ni despliegue comercial. Un repo con archivos de test no equivale a pipelines verdes: comprobar las ejecuciones reales en Actions.
