"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cheerio_1 = require("cheerio");
const API_1 = require("../API");
const Provider_1 = require("../Provider");
/**
 * @description AniDb provider meant for converting Animek IDs to MyAnimeList IDs
 */
class AniDb extends Provider_1.default {
    constructor() {
        super("https://anidb.net", API_1.ProviderType.META);
    }
    async idToMal(id, type) {
        const req = await this.fetch("https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-full.json", { headers: { "Content-Type": "application/json" } });
        const data = req.json();
        const result = data.find((item) => item.anidb_id === Number(id));
        if (!result)
            return null;
        return String(result.mal_id);
    }
    /**
     * @decprecated Use idToMal instead. This method is not working anymore.
     * @description Converts AniDb IDs to MyAnimeList IDs
     * @param id AniDb ID
     * @param type Type of media
     * @returns Promise<string>
     */
    async idToMalOLD(id, type) {
        const req = await this.fetch(`${this.baseURL}/perl-bin/animedb.pl?show=${type.toLowerCase()}&aid=${id}`, {
            headers: {
                Referer: "https://anidb.net/"
            },
            maxRedirects: 0
        });
        // /recaptcha/api2/anchor?ar=1&k=6LcC2xcTAAAAAJR68rjwmWPaAQthH0FJGXcR9r1Q&co=aHR0cHM6Ly9hbmlkYi5uZXQ6NDQz&hl=en&v=gEr-ODersURoIfof1hiDm7R5&size=normal&cb=ki9wailj69i6
        const data = await this.solveCaptcha3FromHTML(req.text(), "https://anidb.net/perl-bin/animedb.pl", req.url);
        console.log(data);
        const $ = (0, cheerio_1.load)(req.text());
        console.log($.html());
        const mal = $("a.i_resource_mal").attr("href");
        if (!mal)
            return null;
        return mal.split(`https://myanimelist.net/${type.toLowerCase()}/`)[1];
    }
}
exports.default = AniDb;
//# sourceMappingURL=AniDb.js.map