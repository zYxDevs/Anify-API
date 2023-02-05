"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const API_1 = require("../API");
const Provider_1 = require("../Provider");
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
    async getChaptersFromPage(id, page) {
        const data = await this.fetch(`${this.api}/comic/${id}/chapter?page=${page}`);
        const json = data.json();
        return json["chapters"].map((chapter) => {
            let title = '';
            if (chapter.vol) {
                title += `Vol. ${chapter.vol} `;
            }
            title += `Ch. ${chapter.chap}`;
            if (chapter.title) {
                title += ` - ${chapter.title}`;
            }
            return {
                url: this.api + "/chapter/" + chapter.hid,
                id: chapter.hid,
                title: title
            };
        });
    }
    async getComicId(id) {
        const req = await this.fetch(`${this.api}${id}`);
        const data = req.json()["comic"];
        return data ? data.id : null;
    }
}
exports.default = ComicK;
//# sourceMappingURL=ComicK.js.map