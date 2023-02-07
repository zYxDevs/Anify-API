"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const API_1 = require("../API");
const Provider_1 = require("../Provider");
class Chiaki extends Provider_1.default {
    constructor() {
        super("https://chiaka.site", API_1.ProviderType.ANIME);
    }
    async search(query) {
        // https://chiaki.site/?/tools/autocomplete_series&term=Kaguya-sama
        const req = await this.fetch(`${this.baseURL}/?/tools/autocomplete_serise&term=${encodeURIComponent(query)}`);
        const data = req.json();
        const results = [];
        data.map((element, index) => {
            results.push({
                title: element.value,
                url: `${this.baseURL}/?/tools/watch_order/id/${element.id}`,
            });
        });
        return results;
    }
}
exports.default = Chiaki;
//# sourceMappingURL=Chiaki.js.map