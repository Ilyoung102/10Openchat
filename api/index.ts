import express from 'express';

const app = express();

// Root-level diagnostics
app.get("/api/ping", (req, res) => {
  res.json({ 
    pong: true, 
    time: new Date().toISOString(),
    version: "v1.62",
    status: "Service is partially operational"
  });
});

app.get("/api/env", (req, res) => {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasTavily = !!process.env.TAVILY_API_KEY;
  
  res.json({ 
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    OPENAI_KEY_PRESENT: hasOpenAI,
    TAVILY_KEY_PRESENT: hasTavily,
    node: process.version,
    instruction: (!hasOpenAI || !hasTavily) 
      ? "Please set OPENAI_API_KEY and TAVILY_API_KEY in Vercel Dashboard -> Environment Variables" 
      : "Environment variables are configured correctly."
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
      stack: e.stack,
      env_status: {
        hasOpenAi: !!process.env.OPENAI_API_KEY,
        hasTavily: !!process.env.TAVILY_API_KEY
      }
    });
  }
});

export default app;
