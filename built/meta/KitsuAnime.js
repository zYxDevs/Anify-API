"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const API_1 = require("../API");
const Provider_1 = require("../Provider");
class KitsuAnime extends Provider_1.default {
    constructor() {
        super("https://kitsu.io", API_1.ProviderType.ANIME);
        this.api = 'https://kitsu.io/api/edge';
    }
    async search(query) {
        const results = [];
        const searchUrl = `/anime?filter[text]=${encodeURIComponent(query)}`;
        try {
            const req = await this.fetch(this.api + searchUrl, {
                headers: {
                    "Accept": "application/vnd.api+json",
                    "Content-Type": "application/vnd.api+json"
                }
            }).catch((err) => {
                return null;
            });
            if (!req) {
                return results;
            }
            const data = req.json();
            if (data.data.length > 0) {
                data.data.forEach((result) => {
                    const altTitles = [];
                    if (result.attributes.titles.en_jp) {
                        altTitles.push(result.attributes.titles.en_jp);
                    }
                    if (result.attributes.titles.ja_jp) {
                        altTitles.push(result.attributes.titles.ja_jp);
                    }
                    if (result.attributes.titles.en_us) {
                        altTitles.push(result.attributes.titles.en_us);
                    }
                    if (result.attributes.titles.en) {
                        altTitles.push(result.attributes.titles.en);
                    }
                    if (result.attributes.titles.en_kr) {
                        altTitles.push(result.attributes.titles.en_kr);
                    }
                    if (result.attributes.titles.ko_kr) {
                        altTitles.push(result.attributes.titles.ko_kr);
                    }
                    results.push({
                        title: result.attributes.titles.en_us || result.attributes.titles.en_jp || result.attributes.titles.ja_jp || result.attributes.titles.en || result.attributes.titles.en_kr || result.attributes.titles.ko_kr,
                        altTitles: altTitles,
                        url: result.links.self,
                    });
                });
                return results;
            }
            else {
                return results;
            }
        }
        catch (e) {
            throw new Error(e);
        }
    }
}
exports.default = KitsuAnime;
//# sourceMappingURL=KitsuAnime.js.map