function errorHandler(err, _req, res, _next) {
  console.error("[http]", err);
  res.status(err.status || 500).json({
    error: err.publicMessage || "Something went wrong. Please try again.",
  });
}

function notFound(_req, res) {
  res.status(404).json({ error: "Not found" });
}

module.exports = { errorHandler, notFound };
