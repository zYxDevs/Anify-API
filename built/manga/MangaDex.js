"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const API_1 = require("../API");
const Provider_1 = require("../Provider");
const config = require("../config.json");
class MangaDex extends Provider_1.default {
    constructor() {
        super("https://mangadex.org", API_1.ProviderType.MANGA);
        this.api = "https://api.mangadex.org";
        this.delay = 250;
    }
    async search(query) {
        let mangaList = [];
        const results = [];
        for (let page = 0; page <= 1; page += 1) {
            const uri = new URL('/manga', this.api);
            uri.searchParams.set('title', query);
            uri.searchParams.set('limit', "25");
            uri.searchParams.set('offset', String(25 * page).toString());
            uri.searchParams.set('order[createdAt]', 'asc');
            uri.searchParams.append('contentRating[]', 'safe');
            uri.searchParams.append('contentRating[]', 'suggestive');
            uri.searchParams.append('contentRating[]', 'erotica');
            uri.searchParams.append('contentRating[]', 'pornographic');
            const request = await this.fetch(uri.href);
            await this.wait(this.delay);
            mangaList = [...mangaList, ...request.json().data];
        }
        for (let i = 0; i < mangaList.length; i++) {
            const manga = mangaList[i];
            const attributes = manga.attributes;
            const relationships = manga.relationships;
            const title = attributes.title["en"] ?? attributes.title["ja"] ?? attributes.title["ja-ro"] ?? attributes.title["ko"];
            let romaji = undefined;
            let native = undefined;
            let korean = undefined;
            let en = undefined;
            attributes.altTitles.map((element, index) => {
                const temp = element;
                if (temp["ja-ro"] != undefined) {
                    romaji = temp["ja-ro"];
                }
                if (temp["ja"] != undefined) {
                    native = temp["ja"];
                }
                if (temp["ko"] != undefined) {
                    korean = temp["ko"];
                }
                if (temp["en"] != undefined) {
                    en = temp["en"];
                }
            });
            if (!native && korean != undefined) {
                native = korean;
            }
            const id = manga.id;
            const url = `${this.baseURL}/title/${id}`;
            let img = "";
            relationships.map((element) => {
                if (element.type === "cover_art") {
                    img = `${this.baseURL}/covers/${id}/${element.id}.jpg.512.jpg`;
                }
            });
            results.push({
                url: url,
                title: title ?? romaji ?? native ?? en,
            });
        }
        return results;
    }
    async getChapters(id) {
        const chapterList = [];
        for (let page = 0, run = true; run; page++) {
            const request = await this.fetch(`${this.api}/manga/${id}/feed?limit=96&translatedLanguage%5B%5D=en&includes[]=scanlation_group&includes[]=user&order[volume]=desc&order[chapter]=desc&offset=${(100 * page)}&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic`).catch((err) => {
                return null;
            });
            if (!request) {
                run = false;
                break;
            }
            await this.wait(this.delay);
            const data = request.json();
            if (!data || !data.result) {
                run = false;
                break;
            }
            if (data.result === "error") {
                const error = data.errors[0];
                throw new Error(error.detail);
            }
            const chapters = [];
            Object.keys(data.data).map((chapter) => {
                const curChapter = data.data[chapter];
                const id = curChapter.id;
                let title = "";
                if (curChapter.attributes.volume) {
                    title += "Vol. " + this._padNum(curChapter.attributes.volume, 2) + " ";
                }
                if (curChapter.attributes.chapter) {
                    title += "Ch. " + this._padNum(curChapter.attributes.chapter, 2) + " ";
                }
                let canPush = true;
                for (let i = 0; i < chapters.length; i++) {
                    if (chapters[i].title === title) {
                        canPush = false;
                    }
                }
                const url = `${this.baseURL}/chapter/${id}`;
                if (canPush) {
                    chapters.push({
                        id, url, title
                    });
                }
            });
            chapters.length > 0 ? chapterList.push(...chapters) : run = false;
        }
        return chapterList;
    }
    async getPages(id) {
        const request = await this.fetch(`${this.api}/at-home/server/${id}`);
        await this.wait(this.delay);
        const data = request.json();
        if (data.result === "error") {
            const error = data.errors[0];
            throw new Error(error.detail);
        }
        const baseUrl = data.baseUrl;
        const hash = data.chapter.hash;
        const pages = [];
        for (let i = 0; i < data.chapter.data.length; i++) {
            const url = `${baseUrl}/data/${hash}/${data.chapter.data[i]}`;
            pages.push({
                url: `${config.web_server.url}/proxy?url=${this.encrypt(url)}&referer=${this.encrypt(this.baseURL)}`,
                index: i
            });
        }
        return pages;
    }
    _padNum(number, places) {
        // Credit to https://stackoverflow.com/a/10073788
        /*
         * '17'
         * '17.5'
         * '17-17.5'
         * '17 - 17.5'
         * '17-123456789'
         */
        let range = number.split('-');
        range = range.map(chapter => {
            chapter = chapter.trim();
            let digits = chapter.split('.')[0].length;
            return '0'.repeat(Math.max(0, places - digits)) + chapter;
        });
        return range.join('-');
    }
}
exports.default = MangaDex;
//# sourceMappingURL=MangaDex.js.map