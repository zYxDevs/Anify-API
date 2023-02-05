"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cheerio_1 = require("cheerio");
const API_1 = require("../API");
const Provider_1 = require("../Provider");
class AnimeFox extends Provider_1.default {
    constructor() {
        super("https://animefox.tv", API_1.ProviderType.ANIME);
    }
    async search(query) {
        const dom = await this.fetch(`${this.baseURL}/search?keyword=${encodeURIComponent(query)}`);
        const results = [];
        const $ = (0, cheerio_1.load)(dom.text());
        $("div.film_list-wrap > div").map((index, element) => {
            const id = $(element).find("div.film-poster > a").attr('href');
            // Title is generally just the romaji name, or the same as the jname
            const title = $(element).find("a.dynamic-name").attr('title');
            //const jName = $(element).find("a.dynamic-name").attr("data-jname")!;
            const url = this.baseURL + id;
            results.push({
                url,
                title: title
            });
        });
        return results;
    }
    async getEpisodes(id) {
        const dom = await this.fetch(`${this.baseURL}${id}`);
        const $ = (0, cheerio_1.load)(dom.text());
        const link = $("div.anisc-detail div.film-buttons a.btn").attr("href") || "";
        const episodes = await this.getEpisodesFromSources(link);
        return episodes;
    }
    async getEpisodesFromSources(id) {
        const dom = await this.fetch(`${this.baseURL}${id}`);
        const $ = (0, cheerio_1.load)(dom.text());
        const episodes = [];
        $("div.ss-list a.ep-item").map((index, element) => {
            episodes?.push({
                id: $(element).attr('href')?.trim(),
                number: $(element).attr("data-number"),
                url: `${this.baseURL}${$(element).attr('href')?.trim()}`,
                title: $(element).attr("title")
            });
        });
        return episodes;
    }
    async getSources(id) {
        const dom = await this.fetch(`${this.baseURL}${id}`);
        const $ = (0, cheerio_1.load)(dom.text());
        const iframe = $("#iframe-to-load").attr("src") || "";
        const streamUrl = `https://goload.io/streaming.php?id=${iframe.split('=').pop()}`;
        const extracted = await this.extractGogoCDN(new URL(streamUrl));
        return extracted;
    }
}
exports.default = AnimeFox;
//# sourceMappingURL=AnimeFox.js.map