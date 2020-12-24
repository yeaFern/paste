import express from 'express';
import * as http from 'http';
import * as bodyparser from 'body-parser';
import cookieparser from 'cookie-parser';

import { customAlphabet } from 'nanoid';
import path from 'path';
import cors from 'cors';
import debug from 'debug';
import rateLimit from 'express-rate-limit';

import * as dotenv from 'dotenv';
dotenv.config({ path: ".env" });

const app = express();
const server = http.createServer(app);
const log = debug("paste");
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 8);

// 25 requests every 10 minutes.
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 25
});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "views/public")));
app.use(bodyparser.text());
app.use(cookieparser());
app.use(cors());

interface Dictionary<T> {
    [Key: string]: T;
}

const pastes: Dictionary<string> = {};

const addNewPaste = (content: string) => {
    const id = nanoid();
    pastes[id] = content;
    return id;
};

app.post("/new", limiter, (req, res) => {
    const auth = req.cookies.auth;
    if(auth && auth === process.env.PASSWORD) {
        const id = addNewPaste(req.body);

        res.status(201).json({
            id
        });
    } else {
        res.status(401).json({
            error: "unauthorized"
        });
    }
});

app.get("/raw/:paste", (req, res, next) => {
    const paste = pastes[req.params.paste];
    if(paste) {
        res.type("text/plain").send(paste);
    } else {
        next();
    }
});

app.get("/:paste", (req, res, next) => {
    const paste = pastes[req.params.paste];
    if(paste) {
        res.render("view_paste", { id: req.params.paste, content: paste });
    } else {
        next();
    }
});

app.get("/", (_, res) => {
    res.render("index");
});

app.use((_, res) => {
    res.status(404).render("not_found");
});

server.listen(process.env.PORT, () => {
    log(`Paste server started on port ${process.env.PORT}`);
});
