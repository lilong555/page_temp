import React from "react";
import { createRoot } from "react-dom/client";
import LongchuanTuneReplica from "../longchuan_tune_replica_page.tsx";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LongchuanTuneReplica />
  </React.StrictMode>,
);
