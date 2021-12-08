import fs from "fs";
import process from "process";

import apn from "@parse/node-apn";
import express from "express";
import morgan from "morgan";

const PORT = process.env.PORT || 5000;

const AUTH_KEY_PATH =
  "/certs/" +
  fs.readdirSync("/certs/").filter((file) => {
    return file.endsWith(".p8");
  })[0];

const apnProvider = new apn.Provider({
  production: true,
  token: {
    key: AUTH_KEY_PATH,
    keyId: process.env.KEY_ID as string,
    teamId: process.env.TEAM_ID as string,
  },
});

async function sendNotification(deviceId: string, alert: apn.NotificationAlertOptions, payload: Object) {
  if (!alert) throw "missing alert";
  const notification = new apn.Notification();
  notification.alert = alert;
  notification.payload = payload;
  notification.topic = process.env.TOPIC as string;
  const result = await apnProvider.send(notification, deviceId);
  if (result.failed.length) {
    const { error, response } = result.failed[0];
    throw error || response;
  }
}

//---- REST API ----

const app = express();
const router = express.Router();

app.use(morgan("tiny"));
app.use(express.json());
app.use("/", router);

function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const { authorization } = req.headers;
  const secret = authorization && authorization.split(" ")[1];
  if (secret && secret === process.env.SECRET) {
    next();
  } else {
    res.sendStatus(401);
  }
}

router.post("/notify", auth, async (req, res) => {
  const { deviceId, alert, payload } = req.body;
  try {
    await sendNotification(deviceId, alert, payload || {});
    res.send({ success: true });
  } catch (e: any) {
    console.error(e);
    res.status(400).send({ success: false, error: e.message || e });
  }
});

router.all("*", (_req, res) => res.sendStatus(404));

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
