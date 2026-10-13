function requireJson(req, res, next) {
  if (req.method === "GET" || req.method === "HEAD") return next();
  if (!req.is("application/json") && Object.keys(req.body || {}).length === 0) {
    return next();
  }
  next();
}

module.exports = { requireJson };
