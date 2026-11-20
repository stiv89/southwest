import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { PassengerApp } from "./passenger/PassengerApp";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element is missing.");

const isPassenger = window.location.pathname.startsWith("/passenger");

createRoot(root).render(
  <StrictMode>
    {isPassenger ? <PassengerApp /> : <App />}
  </StrictMode>,
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}
