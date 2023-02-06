"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const API_1 = require("../API");
const Provider_1 = require("../Provider");
class TMDB extends Provider_1.default {
    constructor() {
        super("https://www.themoviedb.org", API_1.ProviderType.ANIME);
        this.apiUrl = 'https://api.themoviedb.org/3';
        this.api_key = "5201b54eb0968700e693a30576d7d4dc";
    }
    async search(query) {
        const results = [];
        const page = 0;
        const searchUrl = `/search/multi?api_key=${this.api_key}&language=en-US&page=${page}&include_adult=false&query=${query}`;
        try {
            const req = await this.fetch(this.baseURL + searchUrl);
            const data = req.json();
            if (data.results.length > 0) {
                data.results.forEach((result) => {
                    if (result.media_type === "tv") {
                        results.push({
                            title: result.title || result.name,
                            altTitles: [result.original_title || result.original_name, result.title || result.name],
                            url: `https://www.themoviedb.org/tv/${result.id}`,
                        });
                    }
                    else if (result.media_type === "movie") {
                        results.push({
                            title: result.title || result.name,
                            altTitles: [result.original_title || result.original_name, result.title || result.name],
                            url: `https://www.themoviedb.org/movie/${result.id}`,
                        });
                    }
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
    // someone add interface lol thanks
    async getInfo(id) {
        const searchUrl = `${id}?api_key=${this.api_key}&language=en-US&append_to_response=release_dates,watch/providers,alternative_titles,credits,external_ids,images,keywords,recommendations,reviews,similar,translations,videos&include_image_language=en`;
        try {
            const req = await this.fetch(this.apiUrl + searchUrl);
            const json = req.json();
            json.backdrop_path = `https://image.tmdb.org/t/p/original${json.backdrop_path}`;
            json.poster_path = `https://image.tmdb.org/t/p/original${json.poster_path}`;
            return req.json();
        }
        catch (e) {
            throw new Error(e);
        }
    }
}
exports.default = TMDB;
//# sourceMappingURL=TMDB.js.map