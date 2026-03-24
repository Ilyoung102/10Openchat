import express from 'express';

const app = express();

app.get("/api/ping", (req, res) => {
  res.json({ 
    message: "PING OK - STANDALONE", 
    time: new Date().toISOString(),
    vercel: process.env.VERCEL || "0",
    node: process.version
  });
});

// Fallback for other API calls during isolation test
app.all("/api/*", (req, res) => {
  res.status(200).json({ 
    message: "ISOLATION TEST ACTIVE", 
    path: req.path,
    method: req.method
  });
});

export default app;
