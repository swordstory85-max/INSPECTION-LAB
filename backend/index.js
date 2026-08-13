const express = require("express");
const { createInspection } = require("./inspections.js");
const { listTvs } = require("./tvs.js");
const { getInspectionHistory } = require("./history.js");
const { validateInspectionPayload } = require("./validation.js");

const app = express();
const PORT = 4000;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:5173");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
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

app.get("/tvs/:serial/inspections", (req, res) => {
  res.json(getInspectionHistory(req.params.serial));
});

app.listen(PORT, () => {
  console.log(`backend listening on http://localhost:${PORT}`);
});
