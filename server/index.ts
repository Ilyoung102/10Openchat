import { app } from "./app.js";
import { createServer } from "http";

const port = parseInt(process.env.PORT || "5000", 10);
const httpServer = createServer(app);

if (process.env.NODE_ENV !== "production") {
  (async () => {
    const { setupVite } = await import("./vite.js");
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
