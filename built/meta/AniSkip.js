"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const API_1 = require("../API");
const Provider_1 = require("../Provider");
class AniSkip extends Provider_1.default {
    constructor() {
        super("https://aniskip.com", API_1.ProviderType.META);
        this.api = "https://api.aniskip.com/v2";
    }
    async search(query) {
        return [];
    }
    /**
     * @description Different from other providers. Retrieves the skip times for a given AniList ID
     * @param id AniList ID
     */
    async getTimes(idMal, episodeNumber, episodeLength, types) {
        types = types ? types : [Types.OP];
        const req = await this.fetch(`${this.api}/skip-times/${idMal}/${episodeNumber}?types=${types}&episodeLength=${episodeLength}`);
        const data = req.json();
        return data;
    }
}
exports.default = AniSkip;
var Types;
(function (Types) {
    Types["OP"] = "op";
    Types["ED"] = "ed";
    Types["MIXED_OP"] = "mixed-op";
    Types["MIXED_ED"] = "mixed-ed";
    Types["RECAP"] = "recap";
})(Types || (Types = {}));
//# sourceMappingURL=AniSkip.js.map