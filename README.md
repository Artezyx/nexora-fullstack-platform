# Nexora — Enterprise Operations Platform

**React 19 + TypeScript · ASP.NET Core 10 · Entity Framework Core · SQL Server · JWT · RBAC · Auditoría · Idempotencia · GitHub Actions**

Proyecto fullstack de portafolio diseñado para demostrar desarrollo de aplicaciones empresariales, integración REST, modelado relacional, reglas de negocio y automatización de pruebas. **No es un producto comercial ni evidencia de años de experiencia laboral.**

## Qué resuelve
Una organización registra proyectos, incorpora integrantes con permisos Owner/Member y gestiona tareas mediante un flujo controlado: `Backlog → Active → Review → Done`. Cada creación/cambio registra auditoría; las operaciones de creación de tareas admiten reintentos idempotentes y los cambios de estado rechazan versiones antiguas.

## Funcionalidades
| Área | Implementación |
|---|---|
| Interfaz | React 19, TypeScript, hooks, dashboard, tablero, filtros, paginación, formularios, diseño responsive |
| Identidad | Inicio de sesión, registro de organización, hash de contraseñas y JWT |
| Permisos | Owner y Member; rutas protegidas y controles de negocio |
| API | ASP.NET Core 10 REST, servicios y DTOs separados |
| Datos | SQL Server 2022, EF Core 10, índices, claves foráneas y token de concurrencia |
| Calidad | xUnit, Vitest, TypeScript estricto, compilación automatizada |
| Consistencia | Auditoría y mensajes outbox escritos junto al cambio de estado |
| CI/CD | GitHub Actions (compilación y pruebas; sin despliegue automatizado) |
| Entorno | Docker Compose para SQL Server + API; Vite con proxy al backend |

## Inicio local
Se necesita Docker + Docker Compose, Node 22 y npm. Para ejecutar backend fuera de Docker se necesita .NET SDK 10.

```bash
cp .env.example .env
# Edita .env y establece SA_PASSWORD y NEXORA_JWT_KEY (mínimo 32 bytes, aleatorios).
docker compose --env-file .env up --build
```

La API se publica localmente en **http://localhost:5089**. En otra terminal:
```bash
cd web
npm install
npm run dev
```
Abre **http://localhost:5173**, registra una organización y empieza a crear proyectos. La interfaz usa el proxy Vite para `/api` y evita introducir credenciales en el frontend. Los puertos Docker están limitados a `127.0.0.1`.

### Pruebas
```bash
dotnet test tests/Nexora.Tests/Nexora.Tests.csproj
cd web && npm install && npm run typecheck && npm test && npm run build
```
Consulta [Actions](https://github.com/Artezyx/nexora-fullstack-platform/actions) para ver ejecuciones reales. **No se consideran aprobadas hasta que los jobs terminen con `success`.**

## Guías de ingeniería
- [Arquitectura, módulos y límites](docs/ARCHITECTURE.md)
- [Seguridad y riesgos pendientes](docs/SECURITY.md)
- [Pruebas y evidencia](docs/TESTING.md)
- [Demostración paso a paso](docs/DEMO.md)

## Alcance y honestidad técnica
- La solución está estructurada por módulos, no es una implementación estricta de Clean Architecture con proyectos separados.
- El outbox se escribe de manera transaccional, pero aún no se distribuyen eventos: **no hay publicador**.
- La inicialización SQL con `EnsureCreated` es solo para desarrollo. En producción deben existir migraciones.
- No hay controles completos para producción, navegador E2E verificado, pruebas de carga, optimización SQL cuantificada, integración SOAP/VB.NET, SSRS ni Azure DevOps.
- No hay despliegue en Internet ni SLA de disponibilidad.

**Autor del portafolio:** [Artezyx](https://github.com/Artezyx)
