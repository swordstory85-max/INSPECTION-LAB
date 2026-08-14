const express = require("express");
const { createInspection } = require("./inspections.js");
const { listTvs, listDeletedTvs, hideTv } = require("./tvs.js");
const { getInspectionHistory } = require("./history.js");
const { validateInspectionPayload } = require("./validation.js");
const { validateCorrectionPayload, addNoteCorrection } = require("./corrections.js");
const { isValidMonth, writeMonthlyWorkbook } = require("./export.js");

const app = express();
const PORT = process.env.PORT || 4000;
const CORS_ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && CORS_ORIGINS.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json());

app.get("/health", (req, res) => {
  res.type("text/plain").send("OK");
});

app.post("/inspections", (req, res) => {
  const errors = validateInspectionPayload(req.body);
  if (errors.length > 0) {
    res.status(400).json({ errors });
    return;
  }

  const result = createInspection(req.body);
  res.status(201).json(result);
});

app.get("/tvs", (req, res) => {
  res.json(listTvs());
});

app.get("/tvs/deleted", (req, res) => {
  res.json(listDeletedTvs());
});

app.delete("/tvs/:serial", (req, res) => {
  try {
    const result = hideTv(req.params.serial);
    res.status(200).json(result);
  } catch (error) {
    if (error.statusCode) {
      res.status(error.statusCode).json({ errors: [error.message] });
      return;
    }
    throw error;
  }
});

app.get("/tvs/:serial/inspections", (req, res) => {
  res.json(getInspectionHistory(req.params.serial));
});

app.post("/inspections/:id/corrections", (req, res) => {
  const inspectionId = Number(req.params.id);
  const { screen, note } = req.body ?? {};

  const errors = validateCorrectionPayload(inspectionId, screen, note);
  if (errors.length > 0) {
    res.status(400).json({ errors });
    return;
  }

  try {
    const result = addNoteCorrection(inspectionId, screen, note);
    res.status(201).json(result);
  } catch (error) {
    if (error.statusCode) {
      res.status(error.statusCode).json({ errors: [error.message] });
      return;
    }
    throw error;
  }
});

app.get("/inspections/export", async (req, res) => {
  const { month } = req.query;
  if (!isValidMonth(month)) {
    res.status(400).json({ errors: ["month는 YYYY-MM 형식이어야 합니다."] });
    return;
  }

  await writeMonthlyWorkbook(res, month);
});

app.listen(PORT, () => {
  console.log(`backend listening on port ${PORT}`);
});
