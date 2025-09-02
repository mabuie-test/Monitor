# Monitor Backend + Frontend (Node/Express + MongoDB Atlas)

## Requisitos
- Node 18+ (ou LTS)
- MongoDB Atlas URI
- Render/Heroku or servidor

## Setup
1. Copia `.env.example` para `.env` e preenche `MONGO_URI` e `JWT_SECRET`.
2. `npm install`
3. `npm start` (ou deploy no Render)

## Endpoints importantes
- POST `/api/auth/register` {username,password}
- POST `/api/auth/login` {username,password} -> retorna `{ token, user }`
- POST `/api/auth/device/register` (com Authorization Bearer token) { deviceId, label }
- Device -> POST `/api/location`, `/api/sms`, `/api/call`, `/api/media/upload`, `/api/contacts` (device only) **device must be registered & associated to a user**
- Frontend: serve static files em `/public` (index.html + main.js)

## Notes
- GridFS via mongoose.mongo.GridFSBucket
- socket.io used to push `location:new`, `media:new`, `notification:new` to logged-in users
- Media deduplication by SHA-256 checksum (device should also send checksum in metadata optionally)
- JWT tokens are signed without expiry (as requested). To enable expiry, change `signTokenForUser` to include `expiresIn`.
