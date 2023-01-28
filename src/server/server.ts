import Fastify from "fastify";
import cors from '@fastify/cors';
import fastifyFormbody from "@fastify/formbody";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifySwagger from "@fastify/swagger";

import { config } from "../config";

import AniSync from "../AniSync";
import Anime, { SubbedSource } from "../providers/anime/Anime";
import Manga from "../providers/manga/Manga";
import Novels from "../providers/Novels";
import AniList from "../providers/meta/AniList";
import TMDB from "../providers/meta/TMDB";

const aniSync = new AniSync();
const anime = new Anime("", "");
const manga = new Manga("", "");
const novels = new Novels();
const tmdb = new TMDB();

const fastify = Fastify({
    logger: false
});

const fastifyPlugins = [];

const corsPlugin = new Promise((resolve, reject) => {
    fastify.register(cors, {
        origin: config.web_server.cors,
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

const swagger = new Promise((resolve, reject) => {
    fastify.register(fastifySwagger, {
        swagger: {
            info: {
                title: "Anify API",
                description: "Anify API",
                version: "0.1.0"
            },
            externalDocs: {
                url: 'https://swagger.io',
                description: 'Find more info here'
            },
            host: "localhost:" + config.web_server.port,
            schemes: ["http"],
            consumes: ["application/json"],
            produces: ["application/json"]
        }
    }).then(() => {
        resolve(true);
    })  
})

fastifyPlugins.push(corsPlugin);
fastifyPlugins.push(formBody);
fastifyPlugins.push(rateLimit);
fastifyPlugins.push(swagger);

fastify.get("/", async(req, res) => {
    res.type("application/json").code(200);
    return "Welcome to Anify API.";
})

fastify.get("/docs", async(req, res) => {
    res.type("application/json").code(200);
    return "Unfinished. Check back later. Basic Info: Rate limit is 150 request per minute.";
})

fastify.get("/stats", async(req, res) => {
    res.type("application/json").code(200);
    const animeTotal = await anime.getTotal();
    const mangaTotal = await manga.getTotal();
    const novelsTotal = await novels.getTotal();

    return {
        anime: {
            total: animeTotal
        },
        manga: {
            total: mangaTotal
        },
        novels: {
            total: novelsTotal
        },
        media_total: {
            total: animeTotal + mangaTotal + novelsTotal
        }
    }
})

fastify.get("/all/:type", async(req, res) => {
    const type = req.params["type"];

    if (!type) {
        res.type("application/json").code(400);
        return { error: "No type provided." };
    }
    if (type.toLowerCase() === "manga") {
        const popular = await manga.getAll();
        let sorted = [];
        for (let i = 0; i < popular.length; i++) {
            sorted.push([popular[i], popular[i].anilist.favourites]);
        }

        res.type("application/json").code(200);
        return sorted;
    } else if (type.toLowerCase() === "anime") {
        const popular = await anime.getAll();
        let sorted = [];
        for (let i = 0; i < popular.length; i++) {
            sorted.push([popular[i], popular[i].anilist.favourites]);
        }
        sorted = sorted.sort((a, b) => {
            return b[1] - a[1];
        });

        res.type("application/json").code(200);
        return sorted;
    } else {
        res.type("application/json").code(404);
        return { error: "Unknown type." };
    }
})

fastify.post("/all", async(req, res) => {
    const type = req.body["type"];

    if (!type) {
        res.type("application/json").code(400);
        return { error: "No type provided." };
    }
    if (type.toLowerCase() === "manga") {
        const popular = await manga.getAll();
        let sorted = [];
        for (let i = 0; i < popular.length; i++) {
            sorted.push([popular[i], popular[i].anilist.favourites]);
        }

        res.type("application/json").code(200);
        return sorted;
    } else if (type.toLowerCase() === "anime") {
        const popular = await anime.getAll();
        let sorted = [];
        for (let i = 0; i < popular.length; i++) {
            sorted.push([popular[i], popular[i].anilist.favourites]);
        }
        sorted = sorted.sort((a, b) => {
            return b[1] - a[1];
        });

        res.type("application/json").code(200);
        return sorted;
    } else {
        res.type("application/json").code(404);
        return { error: "Unknown type." };
    }
})

fastify.get("/login", async(req, res) => {
    //res.redirect(303, `https://anilist.co/api/v2/oauth/authorize?client_id=${config.mapping.provider.AniList.oath_id}&response_type=token`);
    res.redirect(303, `https://anilist.co/api/v2/oauth/authorize?client_id=${config.mapping.provider.AniList.oath_id}&redirect_uri=${config.web_server.url + "/auth"}&response_type=code`)
});

fastify.get("/auth", async(req, res) => {
    const code = req.query["code"];
    const aniList = new AniList();
    const token = await aniList.auth(code);
    res.type("application/json").code(200);
    return { token: token.access_token };
});

fastify.get("/user/:username", async(req, res) => {
    const name = req.params["username"];

    if (!name) {
        res.type("application/json").code(400);
        return { error: "No username provided." };
    }

    const aniList = new AniList();
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

    const aniList = new AniList();
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

    const aniList = new AniList();
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

    const list = await aniSync.getList(userId, type);
    res.type("application/json").code(200);
    return list;
})

fastify.post("/list/:userId/:type", async(req, res) => {
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

    const list = await aniSync.getList(userId, type);
    res.type("application/json").code(200);
    return list;
})

fastify.get("/popular/:type", async(req, res) => {
    const type = req.params["type"];

    if (!type) {
        res.type("application/json").code(400);
        return { error: "No amount or type provided." };
    }
    if (type.toLowerCase() === "manga") {
        const popular = await aniSync.getPopular("MANGA");

        manga.insert(popular);
        res.type("application/json").code(200);
        return popular;
    } else if (type.toLowerCase() === "anime") {
        const popular = await aniSync.getPopular("ANIME");

        anime.insert(popular);
        res.type("application/json").code(200);
        return popular;
    } else {
        res.type("application/json").code(404);
        return { error: "Unknown type." };
    }
})

fastify.post("/popular/:type", async(req, res) => {
    const type = req.params["type"];

    if (!type) {
        res.type("application/json").code(400);
        return { error: "No amount or type provided." };
    }
    if (type.toLowerCase() === "manga") {
        const popular = await aniSync.getPopular("MANGA");

        manga.insert(popular);
        res.type("application/json").code(200);
        return popular;
    } else if (type.toLowerCase() === "anime") {
        const popular = await aniSync.getPopular("ANIME");

        anime.insert(popular);
        res.type("application/json").code(200);
        return popular;
    } else {
        res.type("application/json").code(404);
        return { error: "Unknown type." };
    }
})

fastify.get("/seasonal/:type/:season", async(req, res) => {
    const type = req.params["type"];
    const season = req.params["season"];

    if (!season || !type) {
        res.type("application/json").code(400);
        return { error: "No season or type provided." };
    }
    if (type.toLowerCase() === "anime") {
        if (season.toLowerCase() === "trending") {
            const data = await aniSync.getTrending("ANIME");
    
            anime.insert(data);
            res.type("application/json").code(200);
            return data;
        } else if (season.toLowerCase() === "season") {
            const data = await aniSync.getSeason("ANIME");
    
            anime.insert(data);
            res.type("application/json").code(200);
            return data;
        } else if (season.toLowerCase() === "next_season") {
            const data = await aniSync.getNextSeason("ANIME");
    
            anime.insert(data);
            res.type("application/json").code(200);
            return data;
        } else if (season.toLowerCase() === "popular") {
            const data = await aniSync.getPopular("ANIME");
    
            anime.insert(data);
            res.type("application/json").code(200);
            return data;
        } else if (season.toLowerCase() === "top") {
            const data = await aniSync.getTop("ANIME");
    
            anime.insert(data);
            res.type("application/json").code(200);
            return data;
        } else {
            res.type("application/json").code(404);
            return { error: "Unknown seasonal type." };
        }
    } else if (type.toLowerCase() === "manga") {
        if (season.toLowerCase() === "trending") {
            const data = await aniSync.getTrending("MANGA");
    
            manga.insert(data);
            res.type("application/json").code(200);
            return data;
        } else if (season.toLowerCase() === "season") {
            const data = await aniSync.getSeason("MANGA");
    
            manga.insert(data);
            res.type("application/json").code(200);
            return data;
        } else if (season.toLowerCase() === "next_season") {
            const data = await aniSync.getNextSeason("MANGA");
    
            manga.insert(data);
            res.type("application/json").code(200);
            return data;
        } else if (season.toLowerCase() === "popular") {
            const data = await aniSync.getPopular("MANGA");
    
            manga.insert(data);
            res.type("application/json").code(200);
            return data;
        } else if (season.toLowerCase() === "top") {
            const data = await aniSync.getTop("MANGA");
    
            manga.insert(data);
            res.type("application/json").code(200);
            return data;
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
        if (season.toLowerCase() === "trending") {
            const data = await aniSync.getTrending("ANIME");
    
            anime.insert(data);
            res.type("application/json").code(200);
            return data;
        } else if (season.toLowerCase() === "season") {
            const data = await aniSync.getSeason("ANIME");
    
            anime.insert(data);
            res.type("application/json").code(200);
            return data;
        } else if (season.toLowerCase() === "next_season") {
            const data = await aniSync.getNextSeason("ANIME");
    
            anime.insert(data);
            res.type("application/json").code(200);
            return data;
        } else if (season.toLowerCase() === "popular") {
            const data = await aniSync.getPopular("ANIME");
    
            anime.insert(data);
            res.type("application/json").code(200);
            return data;
        } else if (season.toLowerCase() === "top") {
            const data = await aniSync.getTop("ANIME");
    
            anime.insert(data);
            res.type("application/json").code(200);
            return data;
        } else {
            res.type("application/json").code(404);
            return { error: "Unknown seasonal type." };
        }
    } else if (type.toLowerCase() === "manga") {
        if (season.toLowerCase() === "trending") {
            const data = await aniSync.getTrending("MANGA");
    
            manga.insert(data);
            res.type("application/json").code(200);
            return data;
        } else if (season.toLowerCase() === "season") {
            const data = await aniSync.getSeason("MANGA");
    
            manga.insert(data);
            res.type("application/json").code(200);
            return data;
        } else if (season.toLowerCase() === "next_season") {
            const data = await aniSync.getNextSeason("MANGA");
    
            manga.insert(data);
            res.type("application/json").code(200);
            return data;
        } else if (season.toLowerCase() === "popular") {
            const data = await aniSync.getPopular("MANGA");
    
            manga.insert(data);
            res.type("application/json").code(200);
            return data;
        } else if (season.toLowerCase() === "top") {
            const data = await aniSync.getTop("MANGA");
    
            manga.insert(data);
            res.type("application/json").code(200);
            return data;
        } else {
            res.type("application/json").code(404);
            return { error: "Unknown seasonal type." };
        }
    } else {
        res.type("application/json").code(404);
        return { error: "Unknown type." };
    }
})

fastify.get("/latest/:type", async(req, res) => {
    const type = req.params["type"];
    res.type("application/josn").code(500);
    return { error: "Method not implemented yet." };
})

fastify.post("/latest/:type", async(req, res) => {
    const type = req.params["type"];
    res.type("application/josn").code(500);
    return { error: "Method not implemented yet." };
})

fastify.get("/search/:type/:query", async(req, res) => {
    const query = req.params["query"];
    const type = req.params["type"];

    if (!query || !type) {
        res.type("application/json").code(400);
        return { error: "No query or type provided." };
    }
    if (type.toLowerCase() === "manga") {
        const result = await aniSync.search(query, "MANGA");

        res.type("application/json").code(200);
        manga.insert(result);
        return result;
    } else if (type.toLowerCase() === "anime") {
        const result = await aniSync.search(query, "ANIME");

        res.type("application/json").code(200);
        anime.insert(result);
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
        const result = await aniSync.search(query, "MANGA");

        res.type("application/json").code(200);
        manga.insert(result);
        return result;
    } else if (type.toLowerCase() === "anime") {
        const result = await aniSync.search(query, "ANIME");

        res.type("application/json").code(200);
        anime.insert(result);
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

fastify.post("/genres/:type", async(req, res) => {
    const included = req.body["included_genres"] ? req.body["included_genres"] : [];
    const excluded = req.body["excluded_genres"] ? req.body["excluded_genres"] : [];

    const type = req.params["type"];

    if (!type) {
        res.type("application/json").code(400);
        return { error: "No query or type provided." };
    }
    if (type.toLowerCase() === "manga") {
        const result = await aniSync.searchGenres("MANGA", included, excluded);

        res.type("application/json").code(200);
        manga.insert(result);
        return result;
    } else if (type.toLowerCase() === "anime") {
        const result = await aniSync.searchGenres("ANIME", included, excluded);

        res.type("application/json").code(200);
        anime.insert(result);
        return result;
    } else {
        res.type("application/json").code(400);
        return { error: "Unknown type for the given type of " + type + "." };
    }
})

fastify.post("/cached/:id", async(req, res) => {
    const id = req.body["id"]
    const type = req.params["type"];

    if (!id || !type) {
        res.type("application/json").code(400);
        return { error: "Invalid request!" };
    }
    res.type("application/json").code(500);
    return { error: "Method not implemented yet." };
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

fastify.get("/tmdb/:id", async(req, res) => {
    const id = req.params["id"];
    if (!id) {
        res.type("application/json").code(400);
        return { error: "No ID provided." };
    }
    const info = await tmdb.getInfo(id);
    res.type("application/json").code(200);
    return info;
})

fastify.post("/tmdb", async(req, res) => {
    const id = req.body["id"];
    if (!id) {
        res.type("application/json").code(400);
        return { error: "No ID provided." };
    }
    const info = await tmdb.getInfo(id);
    res.type("application/json").code(200);
    return info;
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
    fastify.listen({ port: config.web_server.port }, (err, address) => {
        if (err) throw err;
        console.log(`Listening to ${address}.`);
    })
})