# Android con Capacitor

La aplicación incluye `public/` dentro del APK. El modo invitado funciona sin conexión y conserva los datos en el almacenamiento privado del WebView. Las cuentas y los grupos requieren Internet y usan la API HTTPS de producción. Las cookies de sesión las administra la capa nativa de Capacitor; no se guardan tokens en localStorage.

## Compilar el APK de prueba

Requisitos: Node 22 o superior, Java 21 y Android SDK (plataforma 36). Configura `JAVA_HOME` y `android/local.properties` con la ruta de tu SDK.

```powershell
npm ci
powershell -ExecutionPolicy Bypass -File scripts/build-android.ps1
```

Salida: `releases/ToDo-Priority-debug.apk`. Es una compilación de depuración firmada para pruebas; no es una versión de Google Play. Android mínimo: 7.0 (API 24). La clave de depuración debe conservarse para instalar actualizaciones sobre esta misma app. No desinstales si quieres conservar los datos del invitado.

Para instalar con el teléfono conectado y depuración USB habilitada:

```powershell
adb install -r releases/ToDo-Priority-debug.apk
```

## Activar Google en Android

El APK usa Credential Manager, no el botón web dentro del WebView. En el mismo proyecto de Google Cloud que utiliza la web, crea un cliente OAuth de tipo **Android**:

- Nombre sugerido: ToDo Priority Android pruebas.
- Paquete: `com.todopriority.app`.
- SHA-1: utiliza la firma de este APK (véase `releases/APK-INFO.txt`).

Mantén el cliente web existente en `GOOGLE_CLIENT_ID` del backend. No hay que reemplazarlo por el cliente Android ni añadir un secreto al APK. El cliente Android identifica el paquete y la firma; el token utiliza el cliente web como audiencia. Para una distribución definitiva habrá que registrar también la firma de producción o de Google Play.

Hasta registrar el cliente Android, usa correo y contraseña o invitado. No se ha comprobado el acceso con una cuenta real de Google.

## Datos y funciones

- Las cuentas ven las mismas tareas y grupos que la web.
- Los datos del invitado del navegador no se transfieren automáticamente al APK. Usa exportar e importar JSON dentro de Cuenta y grupos.
- Android exporta JSON mediante el menú nativo de compartir; importar abre el selector de archivos.
- Los enlaces de invitación compartidos apuntan a la web. También se pueden pegar en Cuenta y grupos dentro de Android.
- La aplicación no solicita permisos de almacenamiento general, ubicación, contactos ni cámara.
- Cambios web futuros requieren `npm run android:sync` y recompilar el APK.

Referencias: [Capacitor](https://capacitorjs.com/docs/getting-started), [HTTP nativo](https://capacitorjs.com/docs/apis/http), [Google con Credential Manager](https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation).
