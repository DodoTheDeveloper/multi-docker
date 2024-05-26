import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import redis from "redis";
import keys from "./keys.js";

import pg from "pg";
const { Pool } = pg;

const app = express();
app.use(cors());
app.use(bodyParser.json());

const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
  ssl:
    process.env.NODE_ENV !== "production"
      ? false
      : { rejectUnauthorized: false },
});

pgClient.on("error", () => console.error("Lost PG connection"));

pgClient.on("connect", (client) => {
  client
    .query("CREATE TABLE IF NOT EXISTS values(number INT)")
    .catch((err) => console.error(err));
});

const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000,
});
const redisPublisher = redisClient.duplicate();

app.get("/", (req, res) => {
  res.send("Hi");
});

app.get("/values/all", async (req, res) => {
  const values = await pgClient.query("SELECT * from values");
  console.log("[DODO] /values/all values.rows", values.rows);
  res.send(values.rows);
});

app.get("/values/current", async (req, res) => {
  console.log("[DODO] values/current");
  redisClient.hgetall("values", (err, values) => {
    console.log("[DODO] values/current values", values, err);
    res.send(values);
  });
});

app.post("/values", async (req, res) => {
  console.log("[DODO] POST /values", req.body, req.body.index);
  const index = req.body.index;
  if (parseInt(index) > 40) {
    return res.status(422).send("Index too high");
  }
  console.log("[DODO] POST /values index", index);
  redisClient.hset("values", index, "Nothing yet!");
  await redisPublisher.publish("insert", index);
  pgClient.query("INSERT INTO values(number) VALUES($1)", [index]);
  res.send({ working: true });
});

app.listen(5000, (err) => {
  console.log("Listening");
});
