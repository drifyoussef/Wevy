const jwt = require('jsonwebtoken');

const authenticateUser = async (req, res, next) => {
  try {
    // Skip authentication in development if no token
    if (process.env.NODE_ENV === 'development') {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        console.warn('⚠️ Auth disabled in development mode (no token)');
        req.user = { uid: 'dev-user-id', email: 'dev@example.com' };
        return next();
      }
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'wevy_secret');
    
    // Attach user info to request
    req.user = {
      uid: decoded.userId,
      email: decoded.email
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = { authenticateUser };
