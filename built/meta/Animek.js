"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const API_1 = require("../API");
const Provider_1 = require("../Provider");
const AniDb_1 = require("./AniDb");
const AniList_1 = require("./AniList");
class Animek extends Provider_1.default {
    constructor() {
        super("https://animek.fun", API_1.ProviderType.META);
        this.anidb = new AniDb_1.default();
    }
    async search(query) {
        // https://animek.fun/api/search_title?q=test
        throw new Error("Not implemented yet.");
    }
    async getSchedule(start = 0, max = 10) {
        // https://animek.fun/api/schedule
        const req = await this.fetch(`${this.baseURL}/api/schedule`);
        const data = req.json();
        const result = [];
        for (let i = start; i < data.length && i < max; i++) {
            const idMal = await this.anidb.idToMal(String(data[i].anidb.id), AniList_1.Type.ANIME);
            if (idMal) {
                result.push({
                    idMal: idMal,
                    day: data[i].day,
                    datetime: data[i].datetime
                });
            }
        }
        return result;
    }
}
exports.default = Animek;
//# sourceMappingURL=Animek.js.map