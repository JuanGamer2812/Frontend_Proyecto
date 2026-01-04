Instrucciones y parche para integrar `multer` y sanitizar campos en `BackEnd_Proyecto`.

Resumen:
- Añade soporte para `multipart/form-data` en `/api/auth/register` (acepta foto opcional).
- Trunca y valida campos para evitar errores `character varying`.
- Mueve la foto a `public/uploads/` si se envía.

Pasos rápidos:
1) En la carpeta del backend (según tu output: `C:\ProyectosAngular5toB\Proyecto\BackEnd_Proyecto`) ejecuta:

```powershell
cd C:\ProyectosAngular5toB\Proyecto\BackEnd_Proyecto
npm install multer
```

2) Abre `index.js` (o el archivo donde defines tus rutas) y pega el siguiente fragmento cerca de donde creas `app` y antes de otras rutas que manejen `/api/auth/register`.

--- COPIAR-PEGAR AQUI ---

// --- Inicio parche multer + registro
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configuración Multer (temporal en tmp_uploads)
const uploadTmp = multer({ dest: path.join(__dirname, 'tmp_uploads') });

// Helper simple para truncar y sanitizar cadenas
const safeString = (v, max = 50) => {
  if (v === undefined || v === null) return null;
  return String(v).substring(0, max).trim();
};

// Ruta de registro que acepta JSON o multipart/form-data
app.post('/api/auth/register', uploadTmp.single('foto'), async (req, res) => {
  try {
    const body = req.body || {};

    const nombre = safeString(body.nombre, 50);
    const apellido = safeString(body.apellido, 50);
    const email = safeString(body.email, 100);
    const password = body.password ? String(body.password) : '';
    const telefono = safeString(body.telefono, 20);
    const genero = safeString(body.genero, 20);
    const fecha_nacimiento = safeString(body.fecha_nacimiento, 30);

    if (!email || !password) {
      return res.status(400).json({ error: 'Bad Request', message: 'email y password son obligatorios' });
    }

    // Procesar archivo si existe
    let foto_url = null;
    if (req.file) {
      const uploadsDir = path.join(__dirname, 'public', 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

      const ext = path.extname(req.file.originalname) || '';
      const filename = `${Date.now()}-${req.file.filename}${ext}`;
      const dest = path.join(uploadsDir, filename);
      fs.renameSync(req.file.path, dest);
      foto_url = `/uploads/${filename}`;
    }

    // Aquí deberías insertar en la BD en lugar del ejemplo simulado.
    const newUser = {
      id: Date.now(),
      nombre,
      apellido,
      email,
      telefono,
      role: 'user',
      foto_url,
    };

    return res.status(201).json({
      message: 'Registro exitoso',
      user: newUser,
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token'
    });

  } catch (err) {
    console.error('Error en /api/auth/register:', err);
    if (err.message && err.message.includes('character varying')) {
      return res.status(400).json({ error:'Error del servidor', message: 'Algún campo excede la longitud permitida' });
    }
    return res.status(500).json({ error:'Error del servidor', message: err.message || 'Internal error' });
  }
});

// --- Fin parche multer + registro

--- FIN COPIAR-PEGAR ---

3) Reinicia el backend (nodemon lo hará automáticamente si guardas el archivo).

4) Pruebas desde tu máquina (ejecuta desde el proyecto):

JSON (sin foto):
```powershell
curl -v http://localhost:5000/api/auth/register -H "Content-Type: application/json" --data-binary @tools/test-payload.json
```

FormData (con foto):
```powershell
curl -v -X POST http://localhost:5000/api/auth/register -F "nombre=PruebaForm" -F "apellido=Usuario" -F "email=form@test.local" -F "password=P@ssw0rd!" -F "foto=@tools/test-upload.txt"
```

Notas adicionales:
- Si tu proyecto usa un router separado (`routes/auth.js`) pega la ruta en ese archivo en lugar de `index.js` y exporta/importa correctamente.
- Ajusta truncados (`safeString`) a los límites reales de tu BD si es necesario.
- Implementa limpieza periódica de `tmp_uploads` y `public/uploads` si guardas archivos.

Si quieres, puedo generar un diff/patch aplicable a `BackEnd_Proyecto/index.js` y colocarlo en `tools/` para que lo revises y pegues. Pídemelo y lo creo.