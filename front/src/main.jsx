import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthProvider";

// if ("serviceWorker" in navigator) {
//   if ("serviceWorker" in navigator) {
//     navigator.serviceWorker.getRegistration().then((reg) => {
//       if (!reg) {
//         navigator.serviceWorker.register("/service-worker.js");
//       }
//     });
//   }
// }  //Removes offline loading functionality (14/01/2026 :: einbulinda)

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
