// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function (req, res, next) {
  try {
    const authHeader = req.header('Authorization') || req.header('authorization');
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ error: 'No token provided' });

    // 1) buscar user que contenha esse token no array tokens
    const user = await User.findOne({ 'tokens.token': token }).select('_id tokens username');
    if (user) {
      req.userId = user._id;
      req.authKind = 'apiToken';
      // opcional: atualizar lastSeen
      const tok = user.tokens.find(t => t.token === token);
      if (tok) tok.lastSeen = new Date();
      // salvar lastSeen assincronamente (não bloquear)
      user.save().catch(()=>{});
      return next();
    }

    // 2) fallback para JWT se estiver a usar
    if (process.env.JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        req.authKind = 'jwt';
        return next();
      } catch (e) {
        // continuar para erro abaixo
      }
    }

    return res.status(401).json({ error: 'Invalid or expired token' });
  } catch (err) {
    console.error('auth middleware error', err);
    return res.status(500).json({ error: 'Internal auth error' });
  }
};
