import app from "./app.js";
import { PORT } from "./config.js";

app.listen(PORT, () => {
  console.log(`Launch Pad 2026 server running on http://localhost:${PORT}`);
});
