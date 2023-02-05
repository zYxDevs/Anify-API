"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Provider_1 = require("../Provider");
const API_1 = require("../API");
class Enime extends Provider_1.default {
    constructor() {
        super("https://enime.moe", API_1.ProviderType.ANIME);
        this.api = 'https://api.enime.moe';
    }
    async search(query) {
        const page = 0;
        const perPage = 18;
        const req = await this.fetch(`${this.api}/search/${encodeURIComponent(query)}?page=${page}&perPage=${perPage}`);
        const data = req.json();
        if (!data.data) {
            return [];
        }
        return data.data.map((item) => ({
            url: `${this.api}/anime/${item.id}`,
            title: item.title.english ?? item.title.romaji ?? item.title.native,
        }));
    }
    async getEpisodes(id) {
        const req = await this.fetch(`${this.api}${id}`).catch((err) => {
            console.error(err);
            return null;
        });
        if (!req) {
            return [];
        }
        const data = req.json();
        const episodes = data.episodes?.sort((a, b) => b.number - a.number);
        if (!episodes) {
            return [];
        }
        return episodes.map((episode) => {
            return {
                id: episode.id,
                url: `${this.baseURL}/episode/${episode.id}`,
                number: episode.number,
                title: episode.title
            };
        });
    }
    async getSources(id) {
        const req = await this.fetch(`${this.api}/episode/${id}`).catch((err) => {
            console.error(err);
            return null;
        });
        if (!req) {
            return {
                sources: [],
                subtitles: []
            };
        }
        const data = req.json();
        if (!data || !data.sources) {
            return {
                sources: [],
                subtitles: []
            };
        }
        const sourceReq = await this.fetch(`${this.api}/source/${data.sources[0].id}`).catch((err) => {
            console.error(err);
            return null;
        });
        if (!sourceReq) {
            return {
                sources: [],
                subtitles: []
            };
        }
        const sourceResponse = sourceReq.json();
        if (!sourceResponse.url || !sourceResponse.referer) {
            return {
                sources: [],
                subtitles: []
            };
        }
        const url = sourceResponse.url;
        const referer = sourceResponse.referer;
        const response = {
            sources: [],
            subtitles: [],
            intro: {
                start: 0,
                end: 0,
            }
        };
        const resResult = await this.fetch(url, {
            headers: {
                Referer: referer
            }
        });
        const resolutions = resResult.text().match(/(RESOLUTION=)(.*)(\s*?)(\s*.*)/g);
        if (!resolutions) {
            return response;
        }
        resolutions.forEach((ress) => {
            const index = url.lastIndexOf('/');
            const quality = ress.split('\n')[0].split('x')[1].split(',')[0];
            const urll = url.slice(0, index);
            response.sources.push({
                url: urll + '/' + ress.split('\n')[1],
                isM3U8: (urll + ress.split('\n')[1]).includes('.m3u8'),
                quality: quality + 'p',
            });
        });
        response.sources.push({
            url: url,
            isM3U8: url.includes('.m3u8'),
            quality: 'default',
        });
        return response;
    }
}
exports.default = Enime;
//# sourceMappingURL=Enime.js.map