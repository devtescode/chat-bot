import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

createRoot(document.getElementById("root")!).render(<App />);

registerSW({
  immediate: true,
  onOfflineReady() {
    console.log("AI Chat Buddy is ready to work offline");
  },
  onNeedRefresh() {
    console.log("New version available, refresh needed");
  },
});
