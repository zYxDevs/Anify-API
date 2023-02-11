import Fastify from "fastify";
import cors from '@fastify/cors';
import fastifyFormbody from "@fastify/formbody";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyCaching from "@fastify/caching";

import Core from "./Core";
import Novels from "./novels/Novels";
import { Type } from "./meta/AniList";
import { SubbedSource } from "./Provider";

const aniSync = new Core({ is_sqlite: true });
const aniList = aniSync.aniList;
const novels = new Novels();

const fastify = Fastify({
    logger: false
});

const fastifyPlugins = [];

const corsPlugin = new Promise((resolve, reject) => {
    fastify.register(cors, {
        origin: aniSync.config.web_server.cors,
        methods: ['POST', 'GET', 'PATCH', 'DELETE', 'OPTIONS'],
    }).then(() => {
        resolve(true);
    })
});

const formBody = new Promise((resolve, reject) => {
    fastify.register(fastifyFormbody).then(() => {
        resolve(true);
    })
})

const rateLimit = new Promise((resolve, reject) => {
    fastify.register(fastifyRateLimit, {
        max: 150,
        timeWindow: "1 minute"
    }).then(() => {
        resolve(true);
    })
})

const caching = new Promise((resolve, reject) => {
    fastify.register(fastifyCaching, {
        privacy: fastifyCaching.privacy.PRIVATE,
        expiresIn: 60 * 60 * 1000 // 1 hour
    }).then(() => {
        resolve(true);
    })
})

fastifyPlugins.push(corsPlugin);
fastifyPlugins.push(formBody);
fastifyPlugins.push(rateLimit);
fastifyPlugins.push(caching);

fastify.get("/", async(req, res) => {
    res.type("application/json").code(200);
    return `
    Welcome to Anify API.\n
    ---------------------\n
    API Documentation:\n
    GET /all/:type - List all anime or manga.\n
    GET /stats - Get the amount of anime and manga in the database.\n
    GET /login - Redirects to AniList login page.\n
    GET /auth - Redirects to main frontend page.\n
    POST /viewer - Get the viewer's AniList profile.\n
    GET /user/:username - Get a user's AniList profile.\n
    POST /user - Get a user's AniList profile.\n
    POST /update_list - Update a user's AniList list.\n
    GET /list/:userId/:type - Get a user's AniList list.\n
    POST /list - Get a user's AniList list.\n
    GET /seasonal/:type/:season - Get seasonal anime or manga.\n
    POST /seasonal/:type - Get seasonal anime or manga.\n
    GET /search/:type/:query - Search for anime or manga.\n
    POST /search/:type - Search for anime or manga.\n
    GET /schedule - Gets the airing schedule for anime.\n
    GET /schedule?page={page} - Gets the airing schedule for anime.\n
    GET /info/:id - Get anime or manga info.\n
    POST /info - Get anime or manga info.\n
    GET /relations/:id - Get anime or manga relations.\n
    POST /relations - Get anime or manga relations.\n
    GET /tmdb/:id - Gets TMDB info about a show.\n
    POST /tmdb - Gets TMDB info about a show.\n
    GET /themes/:id - Gets anime themes.\n
    POST /themes - Gets anime themes.\n
    GET /covers/:id - Gets manga covers.\n
    POST /covers - Gets manga covers.\n
    GET /episodes/:id - Get anime episodes.\n
    POST /episodes - Get anime episodes.\n
    GET /chapters/:id - Get manga chapters.\n
    POST /chapters - Get manga chapters.\n
    GET /sources/:id/:provider/:watchId - Get anime sources.\n
    POST /sources - Get anime sources.\n
    GET /pages/:id/:provider/:readId - Get manga pages.\n
    POST /pages - Get manga pages.\n
    ---------------------\n
    This documentation is not official and will likely be replaced with https://docs.anify.tv/ in the future.`;
})

fastify.get("/all/:type", async(req, res) => {
    const type = req.params["type"];
    if (!type) {
        res.type("application/json").code(400);
        return { error: "No type provided." };
    }
    if (type.toLowerCase() === "anime") {
        const anime = await aniSync.getAll(Type.ANIME);
        res.type("application/json").code(200);
        return anime;
    } else if (type.toLowerCase() === "manga") {
        const manga = await aniSync.getAll(Type.MANGA);
        res.type("application/json").code(200);
        return manga;
    } else {
        res.type("application/json").code(400);
        return { error: "Invalid type." };
    }
})

fastify.get("/stats", async(req, res) => {
    const anime = await aniSync.getAll(Type.ANIME);
    const manga = await aniSync.getAll(Type.MANGA);
    res.type("application/json").code(200);
    return {
        anime: anime.length,
        manga: manga.length
    }
})

fastify.get("/login", async(req, res) => {
    res.redirect(303, `https://anilist.co/api/v2/oauth/authorize?client_id=${aniSync.config.AniList.oath_id}&redirect_uri=${aniSync.config.web_server.url + "/auth"}&response_type=code`)
});

fastify.get("/auth", async(req, res) => {
    const code = req.query["code"];
    const token = await aniList.auth(code);
    res.redirect(303, `${aniSync.config.web_server.main_url}/auth?token=${token.access_token}`)
});

fastify.post("/viewer", async(req, res) => {
    const token = req.body["token"];

    if (!token) {
        res.type("application/json").code(400);
        return { error: "No token provided." };
    }

    const user = await aniList.getViewer(token);
    res.type("application/json").code(200);
    return user;
});

fastify.get("/user/:username", async(req, res) => {
    const name = req.params["username"];

    if (!name) {
        res.type("application/json").code(400);
        return { error: "No username provided." };
    }

    const list = await aniList.getUser(name);
    res.type("application/json").code(200);
    return list;
})

fastify.post("/user", async(req, res) => {
    const name = req.body["username"];

    if (!name) {
        res.type("application/json").code(400);
        return { error: "No username provided." };
    }

    const list = await aniList.getUser(name);
    res.type("application/json").code(200);
    return list;
})

fastify.post("/update_list", async(req, res) => {
    const token = req.body["token"];
    const variables = req.body["variables"];

    if (!token || !variables) {
        res.type("application/json").code(400);
        return { error: "No token or variables provided." };
    }

    const list = await aniList.updateList(variables, token);
    res.type("application/json").code(200);
    return list;
})

fastify.get("/list/:userId/:type", async(req, res) => {
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
})

fastify.post("/list", async(req, res) => {
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
})

fastify.get("/seasonal/:type/:season", async(req, res) => {
    const type = req.params["type"];
    const season = req.params["season"];

    if (!season || !type) {
        res.type("application/json").code(400);
        return { error: "No season or type provided." };
    }
    if (type.toLowerCase() === "anime") {
        const data = await aniSync.getSeasonal(Type.ANIME, 8);

        if (season.toLowerCase() === "trending") {
            res.type("application/json").code(200);
            return data.trending;
        } else if (season.toLowerCase() === "season") {
            res.type("application/json").code(200);
            return data.season;
        } else if (season.toLowerCase() === "next_season") {
            res.type("application/json").code(200);
            return data.nextSeason;
        } else if (season.toLowerCase() === "popular") {
            res.type("application/json").code(200);
            return data.popular;
        } else if (season.toLowerCase() === "top") {
            res.type("application/json").code(200);
            return data.top;
        } else {
            res.type("application/json").code(404);
            return { error: "Unknown seasonal type." };
        }
    } else if (type.toLowerCase() === "manga") {
        const data = await aniSync.getSeasonal(Type.MANGA, 8);

        if (season.toLowerCase() === "trending") {
            res.type("application/json").code(200);
            return data.trending;
        } else if (season.toLowerCase() === "season") {
            res.type("application/json").code(200);
            return data.season;
        } else if (season.toLowerCase() === "next_season") {
            res.type("application/json").code(200);
            return data.nextSeason;
        } else if (season.toLowerCase() === "popular") {
            res.type("application/json").code(200);
            return data.popular;
        } else if (season.toLowerCase() === "top") {
            res.type("application/json").code(200);
            return data.top;
        } else {
            res.type("application/json").code(404);
            return { error: "Unknown seasonal type." };
        }
    } else {
        res.type("application/json").code(404);
        return { error: "Unknown type." };
    }
})

fastify.post("/seasonal/:type", async(req, res) => {
    const season = req.body["season"];
    const type = req.params["type"];
    
    if (!season || !type) {
        res.type("application/json").code(400);
        return { error: "No season or type provided." };
    }
    if (type.toLowerCase() === "anime") {
        const data = await aniSync.getSeasonal(Type.ANIME, 20);

        if (season.toLowerCase() === "trending") {
            res.type("application/json").code(200);
            return data.trending;
        } else if (season.toLowerCase() === "season") {
            res.type("application/json").code(200);
            return data.season;
        } else if (season.toLowerCase() === "next_season") {;
            res.type("application/json").code(200);
            return data.nextSeason;
        } else if (season.toLowerCase() === "popular") {
            res.type("application/json").code(200);
            return data.popular;
        } else if (season.toLowerCase() === "top") {
            res.type("application/json").code(200);
            return data.top;
        } else {
            res.type("application/json").code(404);
            return { error: "Unknown seasonal type." };
        }
    } else if (type.toLowerCase() === "manga") {
        const data = await aniSync.getSeasonal(Type.MANGA, 20);
        if (season.toLowerCase() === "trending") {
            res.type("application/json").code(200);
            return data.trending;
        } else if (season.toLowerCase() === "season") {
            res.type("application/json").code(200);
            return data.season;
        } else if (season.toLowerCase() === "next_season") {
            res.type("application/json").code(200);
            return data.nextSeason;
        } else if (season.toLowerCase() === "popular") {
            res.type("application/json").code(200);
            return data.popular;
        } else if (season.toLowerCase() === "top") {
            res.type("application/json").code(200);
            return data.top;
        } else {
            res.type("application/json").code(404);
            return { error: "Unknown seasonal type." };
        }
    } else {
        res.type("application/json").code(404);
        return { error: "Unknown type." };
    }
})

fastify.get("/search/:type/:query", async(req, res) => {
    const query = req.params["query"];
    const type = req.params["type"];

    if (!query || !type) {
        res.type("application/json").code(400);
        return { error: "No query or type provided." };
    }
    if (type.toLowerCase() === "manga") {
        const result = await aniSync.search(query, Type.MANGA);

        res.type("application/json").code(200);
        return result;
    } else if (type.toLowerCase() === "anime") {
        const result = await aniSync.search(query, Type.ANIME);

        res.type("application/json").code(200);
        return result;
    } else if(type.toLowerCase() === "novels") {
        const result = await novels.search(query);

        res.type("application/json").code(200);
        return result;
    } else {
        res.type("application/json").code(400);
        return { error: "Unknown type for the given type of " + type + "." };
    }
})

fastify.post("/search/:type", async(req, res) => {
    const query = req.body["query"];
    const type = req.params["type"];

    if (!query || !type) {
        res.type("application/json").code(400);
        return { error: "No query or type provided." };
    }
    if (type.toLowerCase() === "manga") {
        const result = await aniSync.search(query, Type.MANGA);

        res.type("application/json").code(200);
        return result;
    } else if (type.toLowerCase() === "anime") {
        const result = await aniSync.search(query, Type.ANIME);

        res.type("application/json").code(200);
        return result;
    } else if(type.toLowerCase() === "novels") {
        const result = await novels.search(query);

        res.type("application/json").code(200);
        return result;
    } else {
        res.type("application/json").code(400);
        return { error: "Unknown type for the given type of " + type + "." };
    }
})

fastify.get("/schedule", async(req, res) => {
    const page = req.query["page"];

    const start = page ? page * 13 : 0;
    const max = page ? (page * 13) + 13 : 13;

    const data = await aniSync.getSchedule(start, max);
    if (!data) {
        res.type("application/json").code(404);
        return { error: "Not found" };
    }
    res.type("application/json").code(200);
    return data;
})

fastify.get("/info/:id", async(req, res) => {
    const id = req.params["id"]

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
})

fastify.post("/info", async(req, res) => {
    const id = req.body["id"]

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
})

fastify.get("/mal/:type/:id", async(req, res) => {
    const id = req.params["id"];
    const type = req.params["type"];

    if (!id || !type) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }

    const data = await aniSync.getMal(id, type);
    if (!data) {
        res.type("application/json").code(404);
        return { error: "Not found" };
    }
    res.type("application/json").code(200);
    return data;
})

fastify.post("/mal/:type", async(req, res) => {
    const id = req.body["id"];
    const type = req.params["type"];

    if (!id || !type) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }

    const data = await aniSync.getMal(id, type);
    if (!data) {
        res.type("application/json").code(404);
        return { error: "Not found" };
    }
    res.type("application/json").code(200);
    return data;
})

fastify.get("/relations/:id", async(req, res) => {
    const id = req.params["id"]

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
})

fastify.post("/relations", async(req, res) => {
    const id = req.body["id"]

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
})

fastify.get("/tmdb/:id", async(req, res) => {
    const id = req.params["id"]

    if (!id) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }

    const data = await aniSync.getTMDB(id);
    if (!data) {
        res.type("application/json").code(404);
        return { error: "Not found" };
    }
    res.type("application/json").code(200);
    return data;
})

fastify.post("/tmdb", async(req, res) => {
    const id = req.body["id"]

    if (!id) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }

    const data = await aniSync.getTMDB(id);
    if (!data) {
        res.type("application/json").code(404);
        return { error: "Not found" };
    }
    res.type("application/json").code(200);
    return data;
})

fastify.get("/themes/:id", async(req, res) => {
    const id = req.params["id"]

    if (!id) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }

    const data = await aniSync.getThemes(id);
    if (!data) {
        res.type("application/json").code(404);
        return { error: "Not found" };
    }
    res.type("application/json").code(200);
    return data;
})

fastify.post("/themes", async(req, res) => {
    const id = req.body["id"]

    if (!id) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }

    const data = await aniSync.getThemes(id);
    if (!data) {
        res.type("application/json").code(404);
        return { error: "Not found" };
    }
    res.type("application/json").code(200);
    return data;
})

fastify.get("/covers/:id", async(req, res) => {
    const id = req.params["id"]

    if (!id) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }

    const data = await aniSync.getCovers(id);
    if (!data) {
        res.type("application/json").code(404);
        return { error: "Not found" };
    }
    res.type("application/json").code(200);
    return data;
})

fastify.post("/covers", async(req, res) => {
    const id = req.body["id"]

    if (!id) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }

    const data = await aniSync.getCovers(id);
    if (!data) {
        res.type("application/json").code(404);
        return { error: "Not found" };
    }
    res.type("application/json").code(200);
    return data;
})

fastify.get("/episodes/:id", async(req, res) => {
    const id = req.params["id"]

    if (!id) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }
    const episodes = await aniSync.getEpisodes(id);

    res.type("application/json").code(200);
    return episodes;
})

fastify.post("/episodes", async(req, res) => {
    const id = req.body["id"]

    if (!id) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }
    const episodes = await aniSync.getEpisodes(id);

    res.type("application/json").code(200);
    return episodes;
})

fastify.get("/chapters/:id", async(req, res) => {
    const id = req.params["id"];

    if (!id) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }

    const chapters = await aniSync.getChapters(id);

    res.type("application/json").code(200);
    return chapters;
})

fastify.post("/chapters", async(req, res) => {
    const id = req.body["id"];

    if (!id) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }

    const chapters = await aniSync.getChapters(id);

    res.type("application/json").code(200);
    return chapters;
})

fastify.get("/sources/:id/:provider/:watchId", async(req, res) => {
    const id = req.params["id"]
    const provider = req.params["provider"];
    const watchId = req.params["watchId"];

    if (!id || !provider || !watchId) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }

    const sources = await aniSync.getSources(id, provider, watchId);

    res.type("application/json").code(200);
    return sources;
})

fastify.post("/sources", async(req, res) => {
    const id = req.body["id"]
    const provider = req.body["provider"];
    const watchId = req.body["watchId"];

    if (!id || !provider || !watchId) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }

    const sources = await aniSync.getSources(id, provider, watchId).catch((err) => {
        const result:SubbedSource = {
            sources: [],
            subtitles: [],
            intro: {
                start: 0,
                end: 0
            }
        }
        return result;
    });

    res.type("application/json").code(200);
    return sources;
})

fastify.get("/pages/:id/:provider/:readId", async(req, res) => {
    const id = req.params["id"]
    const provider = req.params["provider"];
    const readId = req.params["readId"];

    if (!id || !provider || !readId) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }

    const sources = await aniSync.getPages(id, provider, readId);

    res.type("application/json").code(200);
    return sources;
})

fastify.post("/pages", async(req, res) => {
    const id = req.body["id"]
    const provider = req.body["provider"];
    const readId = req.body["readId"];

    if (!id || !provider || !readId) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }

    const sources = await aniSync.getPages(id, provider, readId);

    res.type("application/json").code(200);
    return sources;
})

fastify.get("/pdf*", async(req, res) => {
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
    } else {
        res.type('application/pdf').code(200);
        return page;
    }
})

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
    } else {
        res.header('Content-Type', 'image/jpeg');
        res.header('Cache-Control', 'public, max-age=31536000');
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET');
        res.header(
            'Access-Control-Allow-Headers',
            'Origin, X-Requested-With, Content-Type, Accept'
        );
        res.header('Access-Control-Allow-Credentials', 'true');
        res.send(page);
    }
})

fastify.get("/proxy", async(req, res) => {
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
})

Promise.all(fastifyPlugins).then(() => {
    fastify.listen({ port: aniSync.config.web_server.port }, (err, address) => {
        if (err) throw err;
        console.log(`Listening to ${address}.`);
    })
})