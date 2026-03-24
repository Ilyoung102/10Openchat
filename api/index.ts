import express from 'express';

const app = express();

// Root-level diagnostics
app.get("/api/ping", (req, res) => {
  res.json({ 
    pong: true, 
    time: new Date().toISOString(),
    version: "v1.61"
  });
});

app.get("/api/env", (req, res) => {
  res.json({ 
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    HAS_OPENAI: !!process.env.OPENAI_API_KEY,
    HAS_TAVILY: !!process.env.TAVILY_API_KEY,
    node: process.version
  });
});

// Dynamic import for the main app to catch startup errors
app.all("/api/*", async (req, res) => {
  try {
    // Note: On Vercel, we need to import from the compiled JS or the TS source correctly.
    // Since Vercel handles TS, we import the .ts file but bundlers often prefer .js or no extension.
    const { app: mainApp } = await import("../server/app");
    return mainApp(req, res);
  } catch (e: any) {
    console.error("Bootstrap Error:", e);
    return res.status(500).json({ 
      error: "BOOTSTRAP_ERROR", 
      message: e.message, 
      stack: e.stack,
      hint: "This error occurs during the import of the main application logic."
    });
  }
});

export default app;
