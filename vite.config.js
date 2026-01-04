export default {
    server: {
        allowedHosts: true,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
                secure: false
            },
            '/socket.io': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
                secure: false,
                ws: true
            },
            '/uploads': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
                secure: false
            }
        }
    }
};