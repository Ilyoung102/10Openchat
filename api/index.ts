import express from 'express';
import { app as mainApp } from "../server/app";

const diagnosticApp = express();

// Root-level diagnostic endpoint that doesn't rely on the main app's initialization
diagnosticApp.get("/api/ping", (req, res) => {
  res.json({ 
    pong: true, 
    time: new Date().toISOString(), 
    vercel: process.env.VERCEL,
    nodeVersion: process.version
  });
});

// Use the main app for everything else
diagnosticApp.use(mainApp);

export default diagnosticApp;
