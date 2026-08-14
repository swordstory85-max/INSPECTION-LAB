const express = require("express");
const { createInspection } = require("./inspections.js");
const { listTvs, listDeletedTvs, hideTv } = require("./tvs.js");
const { getInspectionHistory } = require("./history.js");
const { validateInspectionPayload } = require("./validation.js");
const { validateCorrectionPayload, addNoteCorrection } = require("./corrections.js");
const { isValidMonth, writeMonthlyWorkbook } = require("./export.js");
const { getStats } = require("./stats.js");

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

app.post("/inspections", async (req, res) => {
  const errors = validateInspectionPayload(req.body);
  if (errors.length > 0) {
    res.status(400).json({ errors });
    return;
  }

  const result = await createInspection(req.body);
  res.status(201).json(result);
});

app.get("/tvs", async (req, res) => {
  res.json(await listTvs());
});

app.get("/tvs/deleted", async (req, res) => {
  res.json(await listDeletedTvs());
});

app.delete("/tvs/:serial", async (req, res) => {
  res.status(200).json(await hideTv(req.params.serial));
});

app.get("/tvs/:serial/inspections", async (req, res) => {
  res.json(await getInspectionHistory(req.params.serial));
});

app.post("/inspections/:id/corrections", async (req, res) => {
  const inspectionId = Number(req.params.id);
  const { screen, note } = req.body ?? {};

  const errors = validateCorrectionPayload(inspectionId, screen, note);
  if (errors.length > 0) {
    res.status(400).json({ errors });
    return;
  }

  const result = await addNoteCorrection(inspectionId, screen, note);
  res.status(201).json(result);
});

app.get("/stats", async (req, res) => {
  res.json(await getStats());
});

app.get("/inspections/export", async (req, res) => {
  const { month } = req.query;
  if (!isValidMonth(month)) {
    res.status(400).json({ errors: ["month는 YYYY-MM 형식이어야 합니다."] });
    return;
  }

  await writeMonthlyWorkbook(res, month);
});

// eslint-disable-next-line no-unused-vars -- Express는 인자 개수(4개)로 에러 미들웨어를 구분한다.
app.use((error, req, res, next) => {
  res.status(error.statusCode ?? 500).json({ errors: [error.message] });
});

app.listen(PORT, () => {
  console.log(`backend listening on port ${PORT}`);
});
