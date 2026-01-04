// Mock backend demonstrating how to accept multipart/form-data with multer
// Usage: node tools/mock-backend-multer.js

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const upload = multer({ dest: 'tmp_uploads/' });

const app = express();
app.use(cors());
app.use(express.json());

// Accept both application/json and multipart/form-data
app.post('/api/auth/register', upload.single('foto'), (req, res) => {
    console.log('\n=== Mock backend (multer) received /api/auth/register ===');

    // If multer parsed a file, it will be in req.file
    if (req.file) {
        console.log('Received file:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path,
        });
    }

    // Body will be available in req.body (multipart fields are strings)
    console.log('Fields:', req.body);

    // Simple validation simulation: if email contains 'error' return 500
    const email = (req.body.email || '').toString();
    if (email.includes('error')) {
        return res.status(500).json({ message: 'Simulated server error for testing' });
    }

    // Simulate successful registration response
    const user = {
        id: Math.floor(Math.random() * 10000) + 1,
        nombre: req.body.nombre || 'Usuario',
        email: req.body.email || 'no-reply@example.com',
        telefono: req.body.telefono || null,
        role: 'user',
    };

    const response = {
        message: 'Registro simulado exitoso',
        user,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
    };

    return res.status(200).json(response);
});

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = 5000;
app.listen(PORT, () => console.log(`Mock backend (multer) listening on http://localhost:${PORT}`));

process.on('SIGINT', () => {
    console.log('Shutting down mock backend');
    process.exit(0);
});