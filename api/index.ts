import express from 'express';

const app = express();

const maskKey = (key: string | undefined) => {
  if (!key) return "MISSING";
  if (key.length < 10) return "PRESENT (TOO SHORT)";
  return `${key.substring(0, 7)}...${key.substring(key.length - 4)}`;
};

// Root-level diagnostics
app.get("/api/ping", (req, res) => {
  res.json({ pong: true, time: new Date().toISOString(), version: "v1.65" });
});

app.get("/api/env", (req, res) => {
  res.json({ 
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    SERVER_OPENAI_KEY: maskKey(process.env.OPENAI_API_KEY),
    SERVER_TAVILY_KEY: maskKey(process.env.TAVILY_API_KEY),
    node: process.version
  });
});

// Dynamic import for the main app to catch startup errors
app.all("/api/*", async (req, res) => {
  try {
    const { app: mainApp } = await import("../server/app");
    return mainApp(req, res);
  } catch (e: any) {
    console.error("Bootstrap Error:", e);
    return res.status(500).json({ 
      error: "BOOTSTRAP_ERROR", 
      message: e.message, 
      stack: e.stack 
    });
  }
});

export default app;
