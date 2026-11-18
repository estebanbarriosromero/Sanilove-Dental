# Sanilove Dental

Sitio desplegable en Vercel con funciones serverless y PostgreSQL gestionado en Neon para cuentas, sesiones y afiliaciones.

## Configuración en Vercel

1. Crea una base de datos PostgreSQL en Neon y copia su connection string.
2. Despliega este directorio como raíz del proyecto. Vercel sirve `index.html` y publica automáticamente las funciones de `api/`.
3. En **Settings → Environment Variables**, configura:
   - `DATABASE_URL`: connection string de Neon.
   - `SESSION_SECRET`: cadena aleatoria de al menos 32 caracteres. Puedes generarla con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   - `ADMIN_DNI`: `50259682`.
   - `ADMIN_PASSWORD`: contraseña privada de al menos 12 caracteres para la cuenta administradora.
   - `ADMIN_EMAIL`: email de administración.
   - Las variables de Stripe requeridas por sus endpoints, usando claves válidas del mismo modo (test o live).
4. Redespliega. En la primera petición de autenticación se crean las tablas y la cuenta admin. Inicia sesión con el DNI admin (los ocho dígitos) y `ADMIN_PASSWORD`.

Las altas públicas se guardan como `cliente`; el rol de administrador sólo se asigna a la cuenta aprovisionada por el servidor. Las contraseñas se guardan con bcrypt y la sesión usa una cookie HttpOnly firmada.

## DNI y pólizas

El alta requiere DNI completo (8 cifras y letra de control válida). La letra se comprueba por checksum, lo que valida el formato pero no acredita identidad oficial. El administrador puede añadir o desactivar pólizas en el panel interno. Las afiliaciones sólo se aceptan si la póliza está activa en ese registro; no se consulta directamente a Adeslas, Sanitas o DKV. `12345678` se carga como ejemplo de prueba para Adeslas y aparece marcado como demo.

Las citas y packs heredados de la demostración aún usan el almacenamiento local del navegador; las cuentas y afiliaciones anteriores no se migran automáticamente.

No abras `index.html` con doble clic (`file://`) para iniciar sesión: esa forma de abrirlo no puede acceder a `/api/*`. Este proyecto usa HTML y funciones API de Vercel, no Next.js Server Actions. Para desarrollo local puedes vincular el proyecto con `npx vercel link` y descargar sus variables con `npx vercel env pull .env.development.local`; el servidor local carga ese archivo automáticamente. También puedes copiar `.env.example` a `.env` y completar las variables manualmente. Después ejecuta `npm ci` y `npm run dev` desde la raíz del repositorio. Los archivos `.env*` están excluidos de Git. En producción, las funciones serverless conectan con Neon sin que tengas que mantener un servidor propio.

Para evitar errores de conexión, revisa que `DATABASE_URL`, `SESSION_SECRET` (32+ caracteres) y `ADMIN_PASSWORD` (12+ caracteres) estén configuradas en Vercel y vuelve a desplegar.
