import express from 'express';
import { app as mainApp } from "../server/app.js";

const app = express();

// Basic Heartbeat/Ping
app.get("/api/ping", (req, res) => {
  res.json({ status: "ok", version: "v1.69", time: new Date().toISOString() });
});

// Environment check (safe, without showing keys)
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok",
    node: process.version,
    env: process.env.NODE_ENV,
    hasOpenAiKey: !!process.env.OPENAI_API_KEY,
    hasTavilyKey: !!process.env.TAVILY_API_KEY
  });
});

// Use the main app instance for all other routes
app.use(mainApp);

export default app;
