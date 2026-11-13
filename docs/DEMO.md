# Recorrido de demostración

1. Configura `.env` siguiendo `.env.example` y levanta la API/SQL con Docker Compose.
2. Ejecuta React desde `web` con `npm install && npm run dev`.
3. Abre http://localhost:5173; registra una organización y su primera cuenta Owner.
4. En **Proyectos**, crea «Transformación digital».
5. En **Equipo**, crea un integrante Member con correo de demostración y contraseña de prueba local.
6. En **Tablero**, crea una tarea con proyecto, descripción, prioridad y responsable.
7. Avanza de Backlog a Active, de Active a Review y de Review a Done.
8. Inicia sesión como Member para comprobar que no puede mover una tarea a Done.
9. Abre el historial de una tarea y revisa eventos y revisiones.
10. Examina la tabla Outbox: los mensajes están almacenados para entrega futura, pero no existe publicador.

Los resultados del recorrido deben capturarse (capturas/registro de ejecución) antes de afirmarse como verificados. No insertar datos reales.
