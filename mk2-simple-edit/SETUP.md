# MK2 -- Setup tecnico (checklist de deploy, cliente nuevo)

Mucho mas corto que el de MK5: no hay Edge Functions, ni Stripe, ni Google
Calendar, ni WhatsApp Business API que configurar. De cero a sitio live
editable en menos de 15 min de trabajo tecnico repetible.

---

## 0. Antes de tocar nada -- Intake del cliente (5 min)

- [ ] Nombre del negocio, tagline
- [ ] Telefono, WhatsApp, correo, direccion
- [ ] Texto del hero (titulo + subtitulo) -- o si prefiere que se lo
      redactes tu con base en una charla corta
- [ ] Texto de "sobre nosotros"
- [ ] Lista de servicios/ofrecimientos como texto (nombre + descripcion
      corta, sin precio -- MK2 no maneja precios)
- [ ] Fuente de fotos: logo, foto de portada, fotos de galeria -- ¿el
      cliente las manda, o se usan placeholders mientras tanto?
- [ ] Correo y contrasena que va a usar el dueno para entrar a `/admin`
- [ ] Dominio: ¿ya tiene uno o se compra?

---

## 1. Supabase -- crear proyecto (5 min)

1. [supabase.com](https://supabase.com) -> **New project**
2. Nombre del proyecto, region mas cercana, guarda la contrasena de DB
3. Espera ~2 min a que aprovisione

## 2. Supabase -- correr el schema (1 min)

Pega el contenido de `supabase/schema.sql` completo en **SQL Editor -> New
query -> Run**. Esto crea:
- la tabla `site_content` (con una fila semilla, id = 1)
- el bucket publico `site-media`
- las politicas de RLS (lectura publica, escritura solo autenticado)

Verifica en **Table Editor** que aparecio `site_content` con una fila, y en
**Storage** que aparecio el bucket `site-media`.

## 3. Supabase -- crear el unico usuario admin (2 min)

1. Dashboard -> **Authentication** -> **Users** -> **Add user** (email +
   password, los del intake del paso 0)
2. Eso es todo -- no hay tabla de roles que actualizar. Cualquier usuario
   autenticado puede escribir en `site_content`, y como solo existe este
   usuario, es efectivamente el admin del sitio.

## 4. Supabase -- obtener las keys (1 min)

Dashboard -> **Project Settings** -> **API**:
- `Project URL` -> `VITE_SUPABASE_URL`
- `anon public key` -> `VITE_SUPABASE_ANON_KEY`

(No hay `service_role key` que exponer aqui -- MK2 no tiene funciones
serverless propias.)

## 5. Cargar el contenido inicial (5-10 min)

Opcion recomendada: deploya primero (paso 6), entra a `/admin` con el
usuario del paso 3, y llena todo desde ahi (texto, servicios, sube logo y
fotos). Es el mismo flujo que va a usar el cliente despues para futuros
cambios, asi que sirve de paso para probarlo con el.

## 6. Deploy a Vercel (5 min)

1. Sube este proyecto a un repo de GitHub propio del cliente (NO pushees al
   repo Suitcase -- este repo es solo la plantilla de referencia)
2. [vercel.com](https://vercel.com) -> **New Project** -> importa el repo
3. Framework preset: Vite (detecta solo)
4. **Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy

## 7. Dominio (si el cliente ya tiene uno)

- Vercel -> proyecto -> **Settings** -> **Domains** -> agrega el dominio
- En el proveedor del dominio: apunta los **Nameservers** a los que Vercel
  indique, o crea un registro `A`/`CNAME` segun lo que pida Vercel
- Avisa de antemano al cliente: el certificado SSL puede tardar hasta
  ~30-60 min en propagar

---

## Checklist de calidad antes de entregar

- [ ] Cero emojis salvo, si acaso, uno en el CTA de llamar
- [ ] Cero em-dashes (--) en el copy nuevo que agregues
- [ ] Iconos en SVG, no emoji
- [ ] Probado en movil real, no solo desktop
- [ ] Probado de principio a fin: login en `/admin`, editar texto, subir
      logo y foto de portada, agregar/quitar un servicio, agregar/quitar
      una foto de galeria, Guardar, y confirmar que el sitio publico
      (`/`) refleja el cambio
- [ ] Confirmado que no quedo ningun dato de plantilla generico
      (`"Tu Negocio Aqui"`, telefono `000 0000`, etc.) antes de entregar
      el link al cliente
- [ ] El link de WhatsApp del navbar/hero abre con el numero correcto

---

## El siguiente proyecto: como invocarlo

Cuando en el chat se escriba:

> **"Hagamos un website basado en MK2"**

1. Se abre este mismo template como punto de partida (no se reconstruye
   desde cero)
2. Se corre el intake del paso 0 primero -- si falta un dato, se pregunta,
   no se asume
3. Se sigue este SETUP.md en orden para Supabase + Vercel
4. Se entra a `/admin` con el cliente (o se hace por el) y se carga el
   contenido real
5. Se corre el checklist de calidad antes de entregar el link al cliente

**Regla del template MK2:** si en el proceso se agrega o mejora algo
genuinamente reutilizable que no es especifico de ESE cliente, ese cambio
debe reportarse para actualizarlo tambien aqui, en Suitcase.
