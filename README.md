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


Monitor Backend + Frontend (com autenticação)
---------------------------------------------

1) Copiar .env.example -> .env e preencher MONGO_URI e JWT_SECRET
2) npm install
3) npm start
4) Aceder ao painel: http://<host>:<port>/ (registar / login)

Notas:
- Todas as rotas de dados estão protegidas por JWT e associadas ao userId.
- O app Android deve autenticar (fazer POST /api/auth/login) e enviar o token Authorization: Bearer <token> em cada pedido.
- Ao enviar dados (SMS, calls, location, etc.) a app deve incluir deviceId e incluir o token no header.
- Uploads de media são salvos em GridFS (metadata.userId = userId).
