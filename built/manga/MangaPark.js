"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cheerio_1 = require("cheerio");
const Provider_1 = require("../Provider");
const API_1 = require("../API");
class MangaPark extends Provider_1.default {
    constructor() {
        super("https://v2.mangapark.net", API_1.ProviderType.MANGA);
    }
    async search(query) {
        const url = `${this.baseURL}/search?q=${encodeURIComponent(query)}`;
        try {
            const data = await this.fetch(url);
            const $ = (0, cheerio_1.load)(data.text());
            const results = $('.item').get().map(item => {
                const cover = $(item).find('.cover');
                return {
                    id: `${cover.attr('href')}`,
                    url: `${this.baseURL}${cover.attr("href")}`,
                    title: `${cover.attr('title')}`,
                    img: `${$(cover).find('img').attr('src')}}`,
                };
            });
            return results;
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
    async getChapters(id) {
        const url = `${this.baseURL}${id}`;
        const result = [];
        const data = await this.fetch(url);
        const $ = (0, cheerio_1.load)(data.text());
        $(".py-1.item").get().map((chapter) => {
            const chapId = `${id}/${$(chapter).find("a.ml-1.visited.ch").attr("href").split(`/manga/${id}`).toString().replace(",", "")}`;
            result.push({
                id: chapId,
                title: $(chapter).find('.ml-1.visited.ch').text() + $(chapter).find('div.d-none.d-md-flex.align-items-center.ml-0.ml-md-1.txt').text().trim(),
                url: `${this.baseURL}${chapId}`,
            });
        });
        return result;
    }
    async getPages(id) {
        const regex = /var _load_pages = \[(.*)\]/gm;
        const url = `${this.baseURL}${id.substring(0, id.length - 2)}`;
        try {
            const data = await (await this.fetch(url)).text();
            const varLoadPages = data.match(regex)[0];
            const loadPagesJson = JSON.parse(varLoadPages.replace('var _load_pages = ', ''));
            const pages = loadPagesJson.map((page) => {
                return { url: page.u, index: page.n };
            });
            return pages;
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
}
exports.default = MangaPark;
//# sourceMappingURL=MangaPark.js.map