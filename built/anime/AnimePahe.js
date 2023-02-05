"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Provider_1 = require("../Provider");
const API_1 = require("../API");
class AnimePahe extends Provider_1.default {
    constructor() {
        super("https://animepahe.com", API_1.ProviderType.ANIME);
    }
    async search(query) {
        const req = await this.fetch(`${this.baseURL}/api?m=search&q=${encodeURIComponent(query)}`);
        const data = req.json();
        if (!data.data) {
            return [];
        }
        return data.data.map((item) => ({
            title: item.title,
            url: `${this.baseURL}/anime/${item.session}`
        }));
    }
    async getEpisodes(id) {
        const page = 0;
        const res = await this.fetch(`${this.baseURL}/api?m=release&id=${id}&sort=episode_asc&page=${page}`);
        const epData = res.json().data;
        const episodes = [];
        epData.map((item) => {
            const sessionId = item.session;
            const number = item.episode;
            const title = item.title.length > 0 ? item.title : `Episode ${number}`;
            episodes.push({
                id: sessionId,
                number,
                title,
                url: `${this.baseURL}/play/${id}/${sessionId}`
            });
        });
        return episodes;
    }
    // REQUIRES A M3U8 PROXY
    // Header must include a referer of https://kwik.cx
    async getSources(id) {
        const req = await this.fetch(`${this.baseURL}/api?m=links&id=${id}`, {
            headers: {
                Referer: this.baseURL
            }
        });
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
}
exports.default = AnimePahe;
//# sourceMappingURL=AnimePahe.js.map