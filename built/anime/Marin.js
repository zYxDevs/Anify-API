"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Provider_1 = require("../Provider");
const API_1 = require("../API");
const cheerio_1 = require("cheerio");
class Marin extends Provider_1.default {
    /**
     * REQUIRES MARIN MOE SESSION COOKIE
     */
    constructor() {
        super("https://marin.moe", API_1.ProviderType.ANIME);
    }
    // TODO: Use GET instead of POST
    async search(query) {
        const token = await this.getToken();
        /*
        const req = await this.fetch(`${this.baseURL}/anime`, {
            method: "POST",
            body: JSON.stringify({ search: query }),
            headers: {
                Cookie: `__ddg1_=;__ddg2_=;marinmoe_session=${token};`,
                Referer: `${this.baseURL}`,
            }
        });
        const data:SearchResponse = req.json();

        if (!data.props.anime_list) {
            return [];
        }
        return data.props.anime_list.data.map((item) => ({
            title: item.title,
            url: `${this.baseURL}/anime/${item.slug}`
        }));
        */
        console.log(token);
        return null;
    }
    async getEpisodes(id) {
        id = id.split("/anime/")[1];
        const req = await this.fetch(`${this.baseURL}/anime/${id}`);
        const $ = (0, cheerio_1.load)(req.text());
        const data = JSON.parse($("#__NEXT_DATA__").html());
        const epData = data.props.episode_list.data;
        const episodes = [];
        epData.map((item) => {
            const number = item.sort;
            const title = item.title;
            episodes.push({
                id: `/anime/${id}/${item.slug}`,
                number,
                title,
                url: `${this.baseURL}/anime/${id}/${item.slug}`
            });
        });
        return episodes;
    }
    async getSources(id) {
        const req = await this.fetch(`${this.baseURL}${id}`);
        const data = req.json();
        const links = data.data.map((item) => {
            return {
                quality: Object.keys(item)[0],
                iframe: item[Object.keys(item)[0]].kwik,
                size: item[Object.keys(item)[0]].filesize,
            };
        });
        const sources = {
            sources: [],
            subtitles: [],
            intro: {
                start: 0,
                end: 0
            }
        };
        const promises = [];
        for (const link of links) {
            const promise = new Promise(async (resolve, reject) => {
                // Kwik extractor contains a URL and whether it's an m3u8.
                // But only one source, so we can just take the first one.
                const res = await this.extractKwik(new URL(link.iframe));
                sources.sources.push(res.sources[0]);
                resolve(true);
            });
            promises.push(promise);
        }
        await Promise.all(promises);
        return sources;
    }
    async getToken() {
        const token = [];
        const response = await this.fetch('https://marin.moe/anime', {
            headers: {
                Referer: 'https://marin.moe/anime',
                Cookie: '__ddg1_=;__ddg2_=;',
            },
        });
        token.push(response.headers['set-cookie'][1].replace('marinmoe_session=', '').split(';')[0]);
        token.push(response.headers['set-cookie'][0].replace('XSRF-TOKEN=', '').split(';')[0]);
        return token;
    }
}
exports.default = Marin;
//# sourceMappingURL=Marin.js.map