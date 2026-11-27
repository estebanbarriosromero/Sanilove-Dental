<div align="center">

# 🦷 Sanilove Dental

### Tu sonrisa, nuestra prioridad

**Una clínica dental cercana, transparente y accesible para todas las personas.**
Reserva tu cita, calcula tu tratamiento y gestiona tus packs desde cualquier dispositivo, en español, inglés o chino.

[Tratamientos](#-qué-puedes-hacer-en-la-web) · [Clínicas](#-nuestras-clínicas) · [Accesibilidad](#-accesible-para-todas-las-personas) · [Puesta en marcha](#-puesta-en-marcha) · [Contacto](#-contacto)

</div>

---

## 🎯 Nuestro objetivo

Queremos que ir al dentista sea una experiencia **tranquila, clara y sin sorpresas**. Esta web es la puerta de entrada de Sanilove Dental y se apoya en cuatro ideas:

| | Qué significa para ti |
|---|---|
| 💬 **Transparencia** | Precios visibles, calculadora de tratamientos y cuotas claras antes de decidir. |
| ⏱️ **Comodidad** | Pide, cambia o cancela tu cita en un minuto, sin llamadas ni esperas. |
| ♿ **Accesibilidad** | Lectura en voz alta, texto ajustable y tres idiomas para que nadie se quede fuera. |
| 🤝 **Cercanía** | Seis clínicas en España y un equipo que te acompaña en cada paso. |

---

## ✨ Qué puedes hacer en la web

### Si eres paciente

| Sección | Para qué sirve |
|---|---|
| 🏠 **Inicio** | Conoce la clínica, descubre las soluciones más habituales y mira el vídeo de presentación. |
| 🦷 **Tratamientos** | Explora **blanqueamientos, implantes, ortodoncia y carillas** con paneles interactivos, ve cómo es cada proceso y elige tu plan. |
| 🧮 **Precios** | Calculadora para estimar el coste de lo que te interesa, con tu descuento de afiliado aplicado. |
| 🛡️ **Seguros y packs** | Afíliate con tu seguro (**Adeslas, Sanitas o DKV**), consulta tus ventajas y contrata packs pagando **de una vez o en 6, 12 o 24 cuotas**. |
| 🧪 **Test de necesidades** | Tres preguntas y una recomendación personalizada del tratamiento que mejor encaja contigo. |
| 📍 **Clínicas** | Fotos, direcciones y horarios de cada centro, con búsqueda por ciudad, ampliación de imágenes y botón «Cómo llegar». |
| 📅 **Citas** | Elige clínica, día y hora (las horas ocupadas aparecen bloqueadas) y recibe la confirmación. |
| 👤 **Mi área personal** | Consulta y modifica tus citas, tu afiliación y tus packs. |
| 💬 **Atención al cliente** | Preguntas frecuentes y formulario de contacto. |

### Si formas parte del equipo

- **Panel interno** para gestionar citas y afiliaciones.
- **Gestión de pólizas**: el administrador añade o desactiva las pólizas válidas.
- **Gestión de cuentas** con distintos roles. Solo la cuenta administradora, creada por el servidor, tiene permisos de administración.

---

## ♿ Accesible para todas las personas

El botón **Accesibilidad**, junto a *Pedir cita*, reúne en un solo lugar todo lo necesario:

- 🔊 **Lectura en voz alta** al pasar el cursor o enfocar un elemento: lee solo el texto señalado y lo resalta con un borde rosa. Viene activada y puede desactivarse con el botón **Desactivar lectura**. Al abrir la página da la bienvenida a Sanilove Dental.
- 🔠 **Tamaño del texto** ajustable entre el 85 % y el 130 %.
- 🌍 **Tres idiomas**: español, inglés y chino. La voz se adapta al idioma elegido.
- 🗣️ **Elección de voz** entre las instaladas en tu dispositivo.
- 📱 **Diseño adaptable** a móvil, tableta y ordenador.
- 🌿 **Respeto al movimiento reducido**: las animaciones se desactivan si el dispositivo lo solicita.

Las traducciones viven en `locales.js` y **no se envía ningún texto de la página a servicios externos**.

---

## 🔐 Seguridad y privacidad

- Las **contraseñas** se guardan cifradas con *bcrypt*; nunca en texto plano.
- La **sesión** usa una cookie `HttpOnly` firmada.
- El **alta** exige un DNI completo (8 cifras y letra de control válida) y cada DNI tiene una única cuenta.
- **Recuperar contraseña**: se introduce el DNI y el email de la cuenta y se recibe un enlace de **un solo uso que caduca a los 30 minutos**. Se limita a una solicitud por minuto y, al cambiar la contraseña, se cierran las sesiones anteriores.
- Los archivos `.env` **no se suben a Git**.

> ℹ️ La letra del DNI se valida por su fórmula: comprueba el formato, pero no acredita la identidad oficial. Las pólizas se comprueban contra el registro interno de la clínica; no se consulta directamente a las aseguradoras.

---

## 📍 Nuestras clínicas

| Ciudad | Dirección de ejemplo |
|---|---|
| Móstoles | Calle Antonio Hernández 12 |
| Madrid Centro | Gran Vía 28 |
| Barcelona | Passeig de Gràcia 55 |
| Valencia | Plaça de l’Ajuntament 1 |
| Sevilla | Avenida de la Constitución 18 |
| Bilbao | Gran Vía de Don Diego López de Haro 30 |

> Las direcciones y los horarios son **datos de ejemplo**: confirma los reales antes de publicar.

---

## 🧰 Tecnología

| Capa | Herramienta |
|---|---|
| Web | HTML, CSS y JavaScript, sin necesidad de compilar |
| Servidor | Funciones *serverless* de [Vercel](https://vercel.com) (`api/`) |
| Base de datos | PostgreSQL en [Neon](https://neon.tech) |
| Cuentas y sesiones | `bcryptjs` y `jose` |
| Pagos y facturas | [Stripe](https://stripe.com) (Checkout y facturas por correo) |
| Correos | [Resend](https://resend.com) (recuperación de contraseña) |

---

## 🗂️ Estructura del proyecto

```text
Sanilove-Dental/
├── index.html          # La web completa (diseño, páginas y lógica)
├── locales.js          # Traducciones: español, inglés y chino
├── api/                # Funciones del servidor
│   ├── auth/           #   alta, acceso, sesión y recuperación de contraseña
│   ├── admin/          #   cuentas y pólizas (solo administración)
│   ├── affiliations/   #   afiliación de cada persona
│   ├── policies/       #   verificación de pólizas
│   ├── create-checkout-session.js   # pagos con Stripe
│   └── create-invoice.js            # facturas con Stripe
├── lib/                # Recuperación de contraseña
├── assets/
│   ├── clinics/        # Fotos de las clínicas (.webp)
│   └── videos/         # Vídeo de presentación
├── scripts/dev-server.js   # Servidor para desarrollo local
└── tests/              # Pruebas automáticas
```

---

## 🚀 Puesta en marcha

### 1. Despliegue en Vercel

1. Crea una base de datos PostgreSQL en **Neon** y copia su *connection string*.
2. Despliega esta carpeta como raíz del proyecto en **Vercel**: sirve `index.html` y publica automáticamente las funciones de `api/`.
3. En **Settings → Environment Variables** añade:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Connection string de Neon. |
| `SESSION_SECRET` | Cadena aleatoria de 32 caracteres o más. Genérala con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `ADMIN_DNI` | DNI (8 cifras) de la cuenta administradora. |
| `ADMIN_PASSWORD` | Contraseña privada de 12 caracteres o más para esa cuenta. |
| `ADMIN_EMAIL` | Email de administración. |
| `RESEND_API_KEY` | Clave de Resend para enviar los correos. |
| `EMAIL_FROM` | Remitente verificado en Resend, por ejemplo `Sanilove Dental <noreply@tu-dominio.com>`. |
| `APP_URL` | Dirección pública HTTPS de la web, sin ruta (por ejemplo `https://tu-dominio.com`). |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe (usa claves de *test* o *live*, sin mezclarlas). |

4. Vuelve a desplegar. En la primera petición de acceso se crean las tablas y la cuenta administradora. Inicia sesión con el DNI de administración y `ADMIN_PASSWORD`.

> 🔒 Guarda siempre estas claves como variables privadas de Vercel. **Nunca** las escribas en el código ni las subas a GitHub.

### 2. Desarrollo en tu ordenador

```bash
npm ci                                  # instala las dependencias
npx vercel link                         # vincula el proyecto con Vercel
npx vercel env pull .env.development.local   # descarga las variables
npm run dev                             # arranca el servidor local
```

También puedes copiar `.env.example` a `.env` y rellenar las variables a mano. Para probar los correos en local usa `APP_URL=http://localhost:3000`.

> ⚠️ No abras `index.html` con doble clic: así no puede acceder a `/api/*` y no podrás iniciar sesión. Usa siempre `npm run dev`.

### 3. Pruebas automáticas

```bash
node --test tests/password-reset.test.js
```

---

## 🖼️ Cómo cambiar las fotos de las clínicas

1. Guarda la imagen nueva en `assets/clinics/` (se recomienda `.webp`, de unos 1100 px de ancho).
2. En `index.html`, busca la constante `clinicPhotos` y ajusta la ruta de la ciudad correspondiente.
3. Si algún rótulo queda cortado en la tarjeta, ajusta el encuadre de esa ciudad en `clPos`.

## 🌍 Cómo añadir o corregir una traducción

Abre `locales.js` y añade una línea con el texto en español, en inglés y en chino, por este orden:

```js
["Pedir cita", "Book appointment", "预约"],
```

---

## 🧭 Estado del proyecto y próximos pasos

**Funciona hoy:** cuentas con DNI, recuperación de contraseña por correo, afiliaciones, panel de administración, tres idiomas, accesibilidad, clínicas con fotos, cálculo de precios y simulador de cuotas.

**En evolución:**

- Las **citas y los packs** todavía se guardan en el navegador de cada persona; el siguiente paso es llevarlos a la base de datos para que clínica y paciente vean lo mismo desde cualquier dispositivo.
- **Cobro de cuotas** de los packs con Stripe de extremo a extremo.
- **Verificación en dos pasos** al iniciar sesión.
- Sustituir los **datos de ejemplo** (direcciones, horarios y póliza de prueba `12345678`) por los reales de cada clínica.

---

## 📬 Contacto

**Sanilove Dental** · recepcion@sanilove.dental.org

<div align="center">

© Sanilove Dental. Todos los derechos reservados.

</div>
