import { app, httpServer } from "./app";

const port = parseInt(process.env.PORT || "5000", 10);

if (process.env.NODE_ENV !== "production") {
  (async () => {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
    httpServer.listen(port, "0.0.0.0", () => {
      console.log(`${new Date().toLocaleTimeString()} [express] serving on port ${port}`);
    });
  })();
} else {
  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`${new Date().toLocaleTimeString()} [express] serving on port ${port}`);
  });
}
