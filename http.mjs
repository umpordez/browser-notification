import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'url';

import express from 'express';
import webpush from 'web-push';

const HTTP_PORT = 8000;
const vapidKeys = {
    subject : "mailto:deividyz@gmail.com",
    publicKey: 'BEIExHp6gQ6RBs-2bWFpFRxZkmdp4m29l9BtjjSWPOAddYxCM3k1YLokAtnxVarRuMquQiGslzicGaWBL20kyaM',
    privateKey: 'umejD7kPNtnM82Pk3xB5GH2vQhwUy7t4inHH1mc0mh8'
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

webpush.setVapidDetails(
    vapidKeys.subject,
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

app.use(express.static(path.resolve(__dirname, './public')));
app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, './views/'));

const logger = {
    info: console.log,
    error: console.error
};

const browsersByIdFilepath = path.resolve(__dirname, 'browsers-by-id');

let browsersById = {};
try {
    const contents = await fs.promises.readFile(browsersByIdFilepath);
    browsersById = JSON.parse(contents);
} catch (ex) {
    // ignore
}


async function writeBrowsersById() {
    await fs
        .promises
        .writeFile(browsersByIdFilepath, JSON.stringify(browsersById));
}

function buildHandler(fn) {
    return async (req, res) => {
        try {
            await fn(req, res);
        } catch (ex) {
            logger.error(ex);
            res.status(500).json({ error: ex.message });
        }
    };
}

app.get('/', buildHandler((req, res) => {
    res.render('index', {
        vapidPublicKey: vapidKeys.publicKey,
        browsers: Object.values(browsersById)
    });
}));

app.post('/subscribe', express.json(), buildHandler(async (req, res) => {
    const { browserId, pushSubscription } = req.body;
    browsersById[browserId] = { id: browserId, pushSubscription };

    await writeBrowsersById();

    res.status(200).json({ ok: true });
}));

app.post('/notify-all', express.json(), buildHandler(async (req, res) => {
    const { message } = req.body;
    const str = JSON.stringify({ title: 'Hello World!', body: message });

    for (const { id, pushSubscription } of Object.values(browsersById)) {
        logger.info(`Sending notification for ${id}`);

        try {
            await webpush.sendNotification(pushSubscription, str);
        } catch (ex) {
            logger.error(ex);

            // if error, removes from browsersById
            delete browsersById[id];
        }
    }

    await writeBrowsersById();
    res.status(200).json({ ok: true });
}));

app.listen(HTTP_PORT, () => {
    logger.info(`http server opened on ${HTTP_PORT}`);
});
