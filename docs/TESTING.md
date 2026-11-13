# Plan de pruebas y criterios de evidencia

## Comandos
```bash
dotnet test tests/Nexora.Tests/Nexora.Tests.csproj
cd web
npm install
npm run typecheck
npm test
npm run build
```

## Cobertura implementada
- xUnit: reglas de transición, restricción Owner para finalizar, idempotencia local, aislamiento de organización, creación de eventos de auditoría y rechazo de asignación cruzada.
- Vitest: flujo de estados y permisos representados, payloads HTTP, cabecera de autenticación, Idempotency-Key y errores HTTP.
- GitHub Actions: ejecución automática del build, TypeScript y tests al hacer push a main.

## Pruebas pendientes
- Tests end-to-end reales de navegador con Playwright sobre una API y SQL Server activos.
- Pruebas de seguridad con herramientas DAST/SAST y análisis de dependencias.
- Tests de integridad de EF Core sobre SQL Server real, dos transacciones simultáneas y aislamiento bajo carga.
- Benchmarks reproducibles con latencias p50/p95, saturación, índices y planes de ejecución.
- Publicación de contenedores y validaciones de entorno.
- Pruebas de recuperación ante fallos y envío del outbox.

**No describir ninguno de estos puntos como realizado hasta que haya resultados verificables.**
