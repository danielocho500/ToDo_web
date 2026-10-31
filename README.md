# ToDo Web — Frontend

Interfaz de ToDo Priority, separada del [backend FastAPI](https://github.com/danielocho500/ToDo_Priority).

## Estructura

- `public/`: HTML, CSS y JavaScript originales.
- `nginx/default.conf.template`: sirve la interfaz y reenvía `/api/*` al backend.
- `Dockerfile` y `render.yaml`: despliegue independiente.

La interfaz llama a `/api` en su propio origen. El proxy transmite cookies y encabezados al backend, conservando las sesiones sin cookies de terceros ni CORS. La conexión HTTPS al backend verifica su certificado.

## Netlify

Importa este repositorio desde GitHub, rama `main`. Deja Base directory y Build command vacíos; Publish directory es `public`.

`netlify.toml` configura el proxy `/api/*` hacia `https://todo-priority.onrender.com/api/:splat`. No necesitas BACKEND_URL ni secretos de MongoDB en Netlify. Docker y Nginx se usan solo con las opciones de despliegue siguientes.

Después de publicar, abre `https://TU-SITIO.netlify.app/api/health` y comprueba que devuelve `{"ok":true}`. Luego prueba iniciar sesión, guardar una tarea y recargar. Si cambia la URL del backend, actualiza `netlify.toml` y vuelve a desplegar.

## Render (alternativa a Netlify)

1. Despliega primero ToDo_Priority y comprueba su `/api/health`.
2. Crea un Blueprint desde este repositorio usando `render.yaml`.
3. Configura `BACKEND_URL` con el origen del backend: `https://TU-BACKEND.onrender.com`, sin barra final, ruta, credenciales ni `/api`.
4. Abre la URL HTTPS del frontend y prueba registro, inicio de sesión y tareas.

`/healthz` verifica el servidor web; `/api/health` verifica también el backend y Atlas. El plan gratuito puede suspenderse por inactividad. No incluyas MONGODB_URI ni JWT_SECRET aquí.

## Docker local

Con el backend ejecutándose en el equipo en el puerto 8000 y COOKIE_SECURE=false:

```sh
docker build -t todo-web .
docker run --rm -p 8080:8080 -e BACKEND_URL=http://host.docker.internal:8000 todo-web
```

Abre http://localhost:8080. En Linux agrega `--add-host=host.docker.internal:host-gateway`; si el backend está en otro contenedor, usa una red Docker compartida y su nombre de servicio. El backend debe ser accesible desde Docker: si hace falta, arráncalo con HOST=0.0.0.0 en una red local controlada.

PORT vale 8080 por defecto y respeta el puerto del proveedor. BACKEND_URL es obligatorio. Después de cambiarlo reinicia/reimplanta el contenedor para regenerar la configuración.

No basta con publicar `public/` en GitHub Pages: esta configuración requiere el proxy `/api`. Para otro alojamiento estático, configura allí una reescritura equivalente o adapta la autenticación entre dominios.

## Verificación

GitHub Actions revisa la sintaxis JavaScript, construye Docker, valida Nginx y comprueba la página y `/healthz`. La prueba de conexión y sesión con el backend real se realiza después de configurar las URLs de ambos despliegues.

## Tareas individuales

La prioridad usa valor relativo (beneficio × 2 + penalización × 1), dividido entre costo relativo × 1 + riesgo relativo × 0.5. Se mantiene el multiplicador de urgencia por fecha. Las listas con los antiguos pesos 1/1/1/1 se actualizan al cargarlas; los pesos personalizados se conservan. Los nuevos pesos se guardan con la siguiente edición de la lista, tanto en modo invitado como con sesión. «Ver puntuación» muestra los pesos y el efecto de la fecha.

Al iniciar sesión, Mis tareas está disponible automáticamente sin crear ni elegir un grupo. Es privado y no admite invitaciones. Los grupos compartidos son opcionales y se seleccionan por separado; las tareas anteriores se conservan en su ubicación original.
