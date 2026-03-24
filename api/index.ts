import express from 'express';

const app = express();

// Root-level diagnostics
app.get("/api/ping", (req, res) => {
  res.json({ pong: true, time: new Date().toISOString(), version: "v1.68" });
});

app.get("/api/env", (req, res) => {
  res.json({ 
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    node: process.version
  });
});

// Dynamic import for the main app to catch startup errors
app.all("/api/*", async (req, res) => {
  try {
    // Attempting import with and without extension to ensure compatibility
    let mainAppModule;
    try {
      mainAppModule = await import("../server/app.js");
    } catch (e1) {
      console.warn("Retrying import with .js extension...");
      mainAppModule = await import("../server/app.js");
    }
    
    const { app: mainApp } = mainAppModule;
    return mainApp(req, res);
  } catch (e: any) {
    console.error("Bootstrap Error Detailed:", e);
    return res.status(500).json({ 
      error: "BOOTSTRAP_ERROR", 
      message: e.message, 
      stack: e.stack,
      hint: "Check if all dependencies in package.json are correctly installed and compatible with Node 24."
    });
  }
});

export default app;
