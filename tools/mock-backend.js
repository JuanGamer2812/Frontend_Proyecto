const http = require('http');

// NOTE: Listening on port 443 requires elevated privileges on Windows
const PORT = 443;

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/api/auth/register') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            console.log('\n=== Mock backend received /api/auth/register ===');
            try {
                const json = body ? JSON.parse(body) : {};
                console.log('Payload:', json);
            } catch (e) {
                console.log('Payload (raw):', body);
            }

            const resp = {
                message: 'Simulated Internal Server Error',
                detail: 'Este servidor mock devuelve 500 para reproducir el error',
                timestamp: new Date().toISOString(),
            };

            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(resp));
        });
        return;
    }

    // simple health
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
});

server.listen(PORT, () => console.log(`Mock backend listening on http://localhost:${PORT}`));

process.on('SIGINT', () => {
    console.log('Shutting down mock backend');
    server.close(() => process.exit(0));
});