"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cheerio_1 = require("cheerio");
const API_1 = require("../API");
const Provider_1 = require("../Provider");
const config = require("../config.json");
class Mangakakalot extends Provider_1.default {
    constructor() {
        super("https://mangakakalot.com", API_1.ProviderType.MANGA);
        this.types = {
            CHAPMAGNANATO: "https://chapmanganato.com",
            READMANGANATO: "https://readmanganato.com",
            MANGAKAKALOT: this.baseURL
        };
    }
    async search(query) {
        const data = await this.fetch(`${this.baseURL}/home_json_search`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
            },
            body: `searchword=${encodeURIComponent(this.parseQuery(query))}`
        });
        const json = data.json();
        if (json.length > 0) {
            const results = json.map((result) => {
                const uri = new URL(result.story_link);
                return {
                    url: uri.href,
                    title: this.parseTitle(result.name),
                    id: uri.href.split("https://")[1],
                    img: result.image
                };
            });
            return results;
        }
        else {
            return [];
        }
    }
    async getChapters(id) {
        const type = this.parseType(id);
        if (type === this.types.CHAPMAGNANATO || type === this.types.READMANGANATO) {
            const chapters = await this.fetch(`https://${id}`, {
                maxRedirects: 5
            });
            const $ = (0, cheerio_1.load)(chapters.text());
            const results = [];
            const host = new URL(chapters.url).host;
            $("ul.row-content-chapter li.a-h").map((index, element) => {
                const url = $(element).find("a.chapter-name").attr("href");
                const title = $(element).find("a.chapter-name").attr("title");
                results.push({
                    id: url.split(host)[1],
                    url: url,
                    title: title
                });
            });
            return results;
        }
        else {
            const chapters = await this.fetch(`https://${id}`, {
                maxRedirects: 5
            });
            const $ = (0, cheerio_1.load)(chapters.text());
            const results = [];
            const host = new URL(chapters.url).host;
            $("div.chapter-list div.row").map((index, element) => {
                const url = $(element).find("span a").attr("href");
                const title = $(element).find("span a").attr("title");
                results.push({
                    id: url.split("https://")[1],
                    url: url,
                    title: title
                });
            });
            return results;
        }
    }
    async getPages(id) {
        const result = [];
        const dom = await this.fetch(`https://${id}`);
        const $ = (0, cheerio_1.load)(dom.text());
        $("div.container-chapter-reader img").map((index, element) => {
            result.push({
                url: `${config.web_server.url}/proxy?url=${this.encrypt($(element).attr("src"))}&referer=${this.encrypt("https://" + id)}`,
                index: index
            });
        });
        return result;
    }
    // Change alias function from Mangakakalot
    parseQuery(query) {
        let str = query ? query : "";
        str = str.toLowerCase();
        str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
        str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
        str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
        str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
        str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
        str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
        str = str.replace(/đ/g, "d");
        str = str.replace(/!|@|%|\^|\*|\(|\)|\+|\=|\<|\>|\?|\/|,|\.|\:|\;|\'| |\"|\&|\#|\[|\]|~|-|$|_/g, "_");
        str = str.replace(/_+_/g, "_");
        str = str.replace(/^\_+|\_+$/g, "");
        return str;
    }
    parseTitle(name) {
        return name.replace("<span class=\"search_result_title_red\">", "").replace("</span>", "");
    }
    parseType(id) {
        const type = id.includes("manganato.com") ? id.includes("chapmanganato") ? this.types.CHAPMAGNANATO : this.types.READMANGANATO : this.types.MANGAKAKALOT;
        return type;
    }
}
exports.default = Mangakakalot;
//# sourceMappingURL=Mangakakalot.js.map