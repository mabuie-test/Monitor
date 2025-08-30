Monitor Backend + Frontend
==========================
Estrutura pronta para deploy no Render (Node.js).

1) Copie o conteúdo de .env.example para .env e ajuste MONGO_URI.
2) Instale dependências: npm install
3) Start: npm start
4) API endpoints:
   - POST /api/sms
   - GET  /api/sms
   - POST /api/call
   - GET  /api/call
   - POST /api/location
   - GET  /api/location
   - POST /api/app-usage
   - GET  /api/app-usage
   - POST /api/whatsapp
   - GET  /api/whatsapp
   - POST /api/consent
   - POST /api/media/upload (multipart/form-data file field 'media')
   - GET  /api/media (list metadata)
   - GET  /api/media/:id (download)
Frontend:
   - Served from /frontend (static)
