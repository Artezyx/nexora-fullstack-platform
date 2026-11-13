# Modelo de seguridad y limitaciones

## Controles incorporados
- PasswordHasher ASP.NET Core con sal, verificación segura; contraseña mínima 12 caracteres
- JWT validado por emisor, audiencia, firma, expiración y clave de al menos 32 bytes
- Roles Owner/Member; políticas por endpoint y regla de negocio para finalizar tareas
- Consultas por organización y validación de responsables y proyectos
- SQL parametrizado por EF Core; índices y token de concurrencia
- Limitación de intentos por IP en registro/inicio de sesión
- Sin credenciales ni JWT incrustados en los archivos del repositorio
- Token en memoria de la pestaña, no persistido en localStorage
- Docker enlazado a localhost para los puertos de desarrollo

## Riesgos pendientes antes de producción
1. El primer usuario puede registrar organizaciones sin verificación de correo, captcha ni prevención de abuso sofisticada.
2. La creación de un integrante genera contraseña inicial desde el administrador; falta activación por enlace único y rotación obligatoria.
3. No hay MFA, revocación de JWT, refresh tokens, rotación automática de claves ni gestión de sesiones.
4. No existen seguridad de encabezados HTTP, configuraciones CSP, HSTS, políticas HTTPS completas ni pruebas DAST.
5. No hay autorización fina por proyecto; los miembros de una organización pueden ver todas sus tareas.
6. `EnsureCreated` se usa únicamente en desarrollo; hace falta adoptar migraciones EF versionadas antes de producción.
7. No hay pruebas reales de concurrencia con SQL Server, auditoría resistente a alteraciones, retención de datos, backup/restore ni alertas.
8. El rate limit por IP no es suficiente detrás de proxies sin configuración de forwarded headers confiable.
9. La idempotencia requiere manejo de operaciones concurrentes con pruebas SQL Server y tratamiento explícito de conflictos/reintentos.
10. La salida es un portafolio técnico: no está autorizada para manejar información de clientes reales ni desplegarse públicamente sin revisión.
