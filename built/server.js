"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = require("fastify");
const cors_1 = require("@fastify/cors");
const formbody_1 = require("@fastify/formbody");
const rate_limit_1 = require("@fastify/rate-limit");
const caching_1 = require("@fastify/caching");
const config = require("./config.json");
const Anify_1 = require("./Anify");
const Novels_1 = require("./novels/Novels");
const AniList_1 = require("./meta/AniList");
const aniSync = new Anify_1.default();
const aniList = aniSync.aniList;
const novels = new Novels_1.default();
const fastify = (0, fastify_1.default)({
    logger: false
});
const fastifyPlugins = [];
const corsPlugin = new Promise((resolve, reject) => {
    fastify.register(cors_1.default, {
        origin: config.web_server.cors,
        methods: ['POST', 'GET', 'PATCH', 'DELETE', 'OPTIONS'],
    }).then(() => {
        resolve(true);
    });
});
const formBody = new Promise((resolve, reject) => {
    fastify.register(formbody_1.default).then(() => {
        resolve(true);
    });
});
const rateLimit = new Promise((resolve, reject) => {
    fastify.register(rate_limit_1.default, {
        max: 150,
        timeWindow: "1 minute"
    }).then(() => {
        resolve(true);
    });
});
const caching = new Promise((resolve, reject) => {
    fastify.register(caching_1.default, {
        privacy: caching_1.default.privacy.PRIVATE,
        expiresIn: 60 * 60 * 1000 // 1 hour
    }).then(() => {
        resolve(true);
    });
});
fastifyPlugins.push(corsPlugin);
fastifyPlugins.push(formBody);
fastifyPlugins.push(rateLimit);
fastifyPlugins.push(caching);
fastify.get("/", async (req, res) => {
    res.type("application/json").code(200);
    return "Welcome to Anify API.";
});
fastify.get("/all/:type", async (req, res) => {
    const anime = await aniSync.getAll(AniList_1.Type.ANIME);
    res.type("application/json").code(200);
    return anime;
});
fastify.get("/stats", async (req, res) => {
    const anime = await aniSync.getAll(AniList_1.Type.ANIME);
    const manga = await aniSync.getAll(AniList_1.Type.MANGA);
    res.type("application/json").code(200);
    return {
        anime: anime.length,
        manga: manga.length
    };
});
fastify.get("/login", async (req, res) => {
    res.redirect(303, `https://anilist.co/api/v2/oauth/authorize?client_id=${config.AniList.oath_id}&redirect_uri=${config.web_server.url + "/auth"}&response_type=code`);
});
fastify.get("/auth", async (req, res) => {
    const code = req.query["code"];
    const token = await aniList.auth(code);
    res.redirect(303, `${config.web_server.main_url}/auth?token=${token.access_token}`);
});
fastify.post("/viewer", async (req, res) => {
    const token = req.body["token"];
    if (!token) {
        res.type("application/json").code(400);
        return { error: "No token provided." };
    }
    const user = await aniList.getViewer(token);
    res.type("application/json").code(200);
    return user;
});
fastify.get("/user/:username", async (req, res) => {
    const name = req.params["username"];
    if (!name) {
        res.type("application/json").code(400);
        return { error: "No username provided." };
    }
    const list = await aniList.getUser(name);
    res.type("application/json").code(200);
    return list;
});
fastify.post("/user", async (req, res) => {
    const name = req.body["username"];
    if (!name) {
        res.type("application/json").code(400);
        return { error: "No username provided." };
    }
    const list = await aniList.getUser(name);
    res.type("application/json").code(200);
    return list;
});
fastify.post("/update_list", async (req, res) => {
    const token = req.body["token"];
    const variables = req.body["variables"];
    if (!token || !variables) {
        res.type("application/json").code(400);
        return { error: "No token or variables provided." };
    }
    const list = await aniList.updateList(variables, token);
    res.type("application/json").code(200);
    return list;
});
fastify.get("/list/:userId/:type", async (req, res) => {
    const userId = req.params["userId"];
    let type = req.params["type"];
    if (!userId || !type) {
        res.type("application/json").code(400);
        return { error: "No user ID or type provided." };
    }
    if (type.toLowerCase() != "anime" && type.toLowerCase() != "manga") {
        res.type("application/json").code(400);
        return { error: "Unknown type." };
    }
    type = type.toUpperCase();
    const list = await aniList.getList(userId, type);
    res.type("application/json").code(200);
    return list;
});
fastify.post("/list", async (req, res) => {
    const userId = req.body["userId"];
    let type = req.body["type"];
    if (!userId || !type) {
        res.type("application/json").code(400);
        return { error: "No user ID or type provided." };
    }
    if (type.toLowerCase() != "anime" && type.toLowerCase() != "manga") {
        res.type("application/json").code(400);
        return { error: "Unknown type." };
    }
    type = type.toUpperCase();
    const list = await aniList.getList(userId, type);
    res.type("application/json").code(200);
    return list;
});
fastify.get("/seasonal/:type/:season", async (req, res) => {
    const type = req.params["type"];
    const season = req.params["season"];
    if (!season || !type) {
        res.type("application/json").code(400);
        return { error: "No season or type provided." };
    }
    if (type.toLowerCase() === "anime") {
        const data = await aniSync.getSeasonal(AniList_1.Type.ANIME, 20);
        if (season.toLowerCase() === "trending") {
            res.type("application/json").code(200);
            return data.trending;
        }
        else if (season.toLowerCase() === "season") {
            res.type("application/json").code(200);
            return data.season;
        }
        else if (season.toLowerCase() === "next_season") {
            res.type("application/json").code(200);
            return data.nextSeason;
        }
        else if (season.toLowerCase() === "popular") {
            res.type("application/json").code(200);
            return data.popular;
        }
        else if (season.toLowerCase() === "top") {
            res.type("application/json").code(200);
            return data.top;
        }
        else {
            res.type("application/json").code(404);
            return { error: "Unknown seasonal type." };
        }
    }
    else if (type.toLowerCase() === "manga") {
        const data = await aniSync.getSeasonal(AniList_1.Type.MANGA, 20);
        if (season.toLowerCase() === "trending") {
            res.type("application/json").code(200);
            return data.trending;
        }
        else if (season.toLowerCase() === "season") {
            res.type("application/json").code(200);
            return data.season;
        }
        else if (season.toLowerCase() === "next_season") {
            res.type("application/json").code(200);
            return data.nextSeason;
        }
        else if (season.toLowerCase() === "popular") {
            res.type("application/json").code(200);
            return data.popular;
        }
        else if (season.toLowerCase() === "top") {
            res.type("application/json").code(200);
            return data.top;
        }
        else {
            res.type("application/json").code(404);
            return { error: "Unknown seasonal type." };
        }
    }
    else {
        res.type("application/json").code(404);
        return { error: "Unknown type." };
    }
});
fastify.post("/seasonal/:type", async (req, res) => {
    const season = req.body["season"];
    const type = req.params["type"];
    if (!season || !type) {
        res.type("application/json").code(400);
        return { error: "No season or type provided." };
    }
    if (type.toLowerCase() === "anime") {
        const data = await aniSync.getSeasonal(AniList_1.Type.ANIME, 20);
        if (season.toLowerCase() === "trending") {
            res.type("application/json").code(200);
            return data.trending;
        }
        else if (season.toLowerCase() === "season") {
            res.type("application/json").code(200);
            return data.season;
        }
        else if (season.toLowerCase() === "next_season") {
            ;
            res.type("application/json").code(200);
            return data.nextSeason;
        }
        else if (season.toLowerCase() === "popular") {
            res.type("application/json").code(200);
            return data.popular;
        }
        else if (season.toLowerCase() === "top") {
            res.type("application/json").code(200);
            return data.top;
        }
        else {
            res.type("application/json").code(404);
            return { error: "Unknown seasonal type." };
        }
    }
    else if (type.toLowerCase() === "manga") {
        const data = await aniSync.getSeasonal(AniList_1.Type.MANGA, 20);
        if (season.toLowerCase() === "trending") {
            res.type("application/json").code(200);
            return data.trending;
        }
        else if (season.toLowerCase() === "season") {
            res.type("application/json").code(200);
            return data.season;
        }
        else if (season.toLowerCase() === "next_season") {
            res.type("application/json").code(200);
            return data.nextSeason;
        }
        else if (season.toLowerCase() === "popular") {
            res.type("application/json").code(200);
            return data.popular;
        }
        else if (season.toLowerCase() === "top") {
            res.type("application/json").code(200);
            return data.top;
        }
        else {
            res.type("application/json").code(404);
            return { error: "Unknown seasonal type." };
        }
    }
    else {
        res.type("application/json").code(404);
        return { error: "Unknown type." };
    }
});
fastify.get("/search/:type/:query", async (req, res) => {
    const query = req.params["query"];
    const type = req.params["type"];
    if (!query || !type) {
        res.type("application/json").code(400);
        return { error: "No query or type provided." };
    }
    if (type.toLowerCase() === "manga") {
        const result = await aniSync.search(query, AniList_1.Type.MANGA);
        res.type("application/json").code(200);
        return result;
    }
    else if (type.toLowerCase() === "anime") {
        const result = await aniSync.search(query, AniList_1.Type.ANIME);
        res.type("application/json").code(200);
        return result;
    }
    else if (type.toLowerCase() === "novels") {
        const result = await novels.search(query);
        res.type("application/json").code(200);
        return result;
    }
    else {
        res.type("application/json").code(400);
        return { error: "Unknown type for the given type of " + type + "." };
    }
});
fastify.post("/search/:type", async (req, res) => {
    const query = req.body["query"];
    const type = req.params["type"];
    if (!query || !type) {
        res.type("application/json").code(400);
        return { error: "No query or type provided." };
    }
    if (type.toLowerCase() === "manga") {
        const result = await aniSync.search(query, AniList_1.Type.MANGA);
        res.type("application/json").code(200);
        return result;
    }
    else if (type.toLowerCase() === "anime") {
        const result = await aniSync.search(query, AniList_1.Type.ANIME);
        res.type("application/json").code(200);
        return result;
    }
    else if (type.toLowerCase() === "novels") {
        const result = await novels.search(query);
        res.type("application/json").code(200);
        return result;
    }
    else {
        res.type("application/json").code(400);
        return { error: "Unknown type for the given type of " + type + "." };
    }
});
fastify.get("/info/:id", async (req, res) => {
    const id = req.params["id"];
    if (!id) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }
    const data = await aniSync.get(id);
    if (!data) {
        res.type("application/json").code(404);
        return { error: "Not found" };
    }
    res.type("application/json").code(200);
    return data;
});
fastify.post("/info", async (req, res) => {
    const id = req.body["id"];
    if (!id) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }
    const data = await aniSync.get(id);
    if (!data) {
        res.type("application/json").code(404);
        return { error: "Not found" };
    }
    res.type("application/json").code(200);
    return data;
});
fastify.get("/relations/:id", async (req, res) => {
    const id = req.params["id"];
    if (!id) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }
    const data = await aniSync.getRelations(id);
    if (!data) {
        res.type("application/json").code(404);
        return { error: "Not found" };
    }
    res.type("application/json").code(200);
    return data;
});
fastify.post("/relations", async (req, res) => {
    const id = req.body["id"];
    if (!id) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }
    const data = await aniSync.getRelations(id);
    if (!data) {
        res.type("application/json").code(404);
        return { error: "Not found" };
    }
    res.type("application/json").code(200);
    return data;
});
fastify.get("/episodes/:id", async (req, res) => {
    const id = req.params["id"];
    if (!id) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }
    const episodes = await aniSync.getEpisodes(id);
    res.type("application/json").code(200);
    return episodes;
});
fastify.post("/episodes", async (req, res) => {
    const id = req.body["id"];
    if (!id) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }
    const episodes = await aniSync.getEpisodes(id);
    res.type("application/json").code(200);
    return episodes;
});
fastify.get("/chapters/:id", async (req, res) => {
    const id = req.params["id"];
    if (!id) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }
    const chapters = await aniSync.getChapters(id);
    res.type("application/json").code(200);
    return chapters;
});
fastify.post("/chapters", async (req, res) => {
    const id = req.body["id"];
    if (!id) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }
    const chapters = await aniSync.getChapters(id);
    res.type("application/json").code(200);
    return chapters;
});
fastify.get("/sources/:id/:provider/:watchId", async (req, res) => {
    const id = req.params["id"];
    const provider = req.params["provider"];
    const watchId = req.params["watchId"];
    if (!id || !provider || !watchId) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }
    const sources = await aniSync.getSources(id, provider, watchId);
    res.type("application/json").code(200);
    return sources;
});
fastify.post("/sources", async (req, res) => {
    const id = req.body["id"];
    const provider = req.body["provider"];
    const watchId = req.body["watchId"];
    if (!id || !provider || !watchId) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }
    const sources = await aniSync.getSources(id, provider, watchId).catch((err) => {
        const result = {
            sources: [],
            subtitles: [],
            intro: {
                start: 0,
                end: 0
            }
        };
        return result;
    });
    res.type("application/json").code(200);
    return sources;
});
fastify.get("/pages/:id/:provider/:readId", async (req, res) => {
    const id = req.params["id"];
    const provider = req.params["provider"];
    const readId = req.params["readId"];
    if (!id || !provider || !readId) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }
    const sources = await aniSync.getPages(id, provider, readId);
    res.type("application/json").code(200);
    return sources;
});
fastify.post("/pages", async (req, res) => {
    const id = req.body["id"];
    const provider = req.body["provider"];
    const readId = req.body["readId"];
    if (!id || !provider || !readId) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }
    const sources = await aniSync.getPages(id, provider, readId);
    res.type("application/json").code(200);
    return sources;
});
fastify.get("/pdf*", async (req, res) => {
    const url = req.url.split("/pdf")[1];
    if (!url) {
        res.type("application/json").code(400);
        return { error: "No id provided." };
    }
    const path = decodeURIComponent(url);
    const page = await novels.getPDF(path);
    if (!page) {
        res.type('application/json').code(404);
        return { error: "Cover not found." };
    }
    else {
        res.type('application/pdf').code(200);
        return page;
    }
});
fastify.get("/cover*", (req, res) => {
    const url = req.url.split("/cover")[1];
    if (!url) {
        res.type("application/json").code(400);
        return { error: "No id provided." };
    }
    const path = decodeURIComponent(url);
    const page = novels.getCover(path);
    if (!page) {
        res.type('application/json').code(404);
        return { error: "Cover not found." };
    }
    else {
        res.header('Content-Type', 'image/jpeg');
        res.header('Cache-Control', 'public, max-age=31536000');
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.send(page);
    }
});
fastify.get("/proxy", async (req, res) => {
    const url = aniSync.decrypt(req.query["url"]);
    const referer = aniSync.decrypt(req.query["referer"]);
    if (!url || !referer || url.length === 0 || referer.length === 0) {
        res.type("application/json").code(400);
        return { error: "Could not decrypt url/referer." };
    }
    res.header('Content-Type', 'image/jpeg');
    res.header('Cache-Control', 'public, max-age=31536000');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Referer', referer);
    res.send(await aniSync.getImage(url, { headers: { referer } }));
});
Promise.all(fastifyPlugins).then(() => {
    fastify.listen({ port: config.web_server.port }, (err, address) => {
        if (err)
            throw err;
        console.log(`Listening to ${address}.`);
    });
});
//# sourceMappingURL=server.js.map