"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cheerio_1 = require("cheerio");
const API_1 = require("../API");
const Provider_1 = require("../Provider");
class LiveChart extends Provider_1.default {
    constructor() {
        super("https://www.livechart.me", API_1.ProviderType.ANIME);
    }
    async search(query) {
        const results = [];
        const req = await this.fetch(`${this.baseURL}/search?q=${encodeURIComponent(query)}`);
        const $ = (0, cheerio_1.load)(req.text());
        $('div.callout.grouped-list.anime-list > li.anime-item').each((i, e) => {
            results.push({
                title: $(e).attr('data-title'),
                url: `${this.baseURL}/anime/${$(e).attr('data-anime-id')}`,
            });
        });
        return results;
    }
}
exports.default = LiveChart;
//# sourceMappingURL=LiveChart.js.map