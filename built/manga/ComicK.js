"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const API_1 = require("../API");
const Provider_1 = require("../Provider");
const cheerio_1 = require("cheerio");
class ComicK extends Provider_1.default {
    constructor() {
        super("https://comick.app", API_1.ProviderType.MANGA);
        this.api = "https://api.comick.app";
        this.image = "https://meo.comick.pictures";
    }
    async search(query) {
        const data = await this.fetch(`${this.api}/search?q=${encodeURIComponent(query)}`);
        const json = data.json();
        const results = json.map((result) => {
            let cover = result.md_covers ? result.md_covers[0] : null;
            if (cover && cover.b2key != undefined) {
                cover = this.image + cover.b2key;
            }
            // There are alt titles in the md_titles array
            return {
                url: this.baseURL + "/comic/" + result.slug,
                title: result.title ? result.title : result.slug
            };
        });
        return results;
    }
    async getChapters(id) {
        const chapterList = [];
        const comicId = await this.getComicId(id);
        if (!comicId) {
            return chapterList;
        }
        for (let page = 1, run = true; run; page++) {
            const chapters = await this.getChaptersFromPage(comicId, page);
            chapters.length > 0 ? chapterList.push(...chapters) : run = false;
        }
        return chapterList;
    }
    async getPages(id) {
        const req = await this.fetch(`${this.api}/chapter/${id}`);
        const data = req.json();
        return data.chapter.md_images.map((image, index) => {
            return {
                url: `${this.image}/${image.b2key}?width=${image.w}`,
                index: index
            };
        });
    }
    /**
     * @description Get the covers for a comic
     * @param id ComicK slug (NOT ComicK ID)
     * @returns Promise<Array<Cover>>
     */
    async getCovers(id) {
        const req = await this.fetch(`${this.baseURL}${id}/covers`).catch((err) => {
            return null;
        });
        if (!req) {
            return null;
        }
        const $ = (0, cheerio_1.load)(req.text());
        const data = JSON.parse($("#__NEXT_DATA__").html());
        return data.props.pageProps.comic.md_covers;
    }
    parseCover(cover) {
        return {
            volume: cover.vol,
            url: `${this.image}/${cover.b2key}?width=${cover.w}`
        };
    }
    async getChaptersFromPage(id, page) {
        const data = await this.fetch(`${this.api}/comic/${id}/chapter?page=${page}`);
        const json = data.json();
        const result = [];
        json["chapters"].map((chapter) => {
            let title = '';
            if (chapter.group_name && chapter.group_name.length > 0) {
                title += `[${chapter.group_name[0]}] `;
            }
            if (chapter.vol) {
                title += `Vol. ${chapter.vol} `;
            }
            title += `Ch. ${chapter.chap}`;
            if (chapter.title) {
                title += ` - ${chapter.title}`;
            }
            if (chapter.lang === "en") {
                result.push({
                    url: this.api + "/chapter/" + chapter.hid,
                    id: chapter.hid,
                    title: title
                });
            }
        });
        return result;
    }
    async getComicId(id) {
        const req = await this.fetch(`${this.api}${id}`);
        const data = req.json()["comic"];
        return data ? data.id : null;
    }
}
exports.default = ComicK;
//# sourceMappingURL=ComicK.js.map