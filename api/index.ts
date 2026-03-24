import express from 'express';
import { app as mainApp } from "../server/app";

const app = express();

// Diagnostic Endpoints (at the top to ensure they always work)
app.get("/api/ping", (req, res) => {
  res.json({ pong: true, version: "v1.64", env: process.env.VERCEL ? "vercel" : "local" });
});

app.get("/api/env", (req, res) => {
  res.json({ 
    NODE_ENV: process.env.NODE_ENV,
    HAS_OPENAI: !!process.env.OPENAI_API_KEY,
    HAS_TAVILY: !!process.env.TAVILY_API_KEY,
    node: process.version
  });
});

// Use the main app instance for all routes (including /api/*)
app.use(mainApp);

export default app;
