"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cheerio_1 = require("cheerio");
const Provider_1 = require("../Provider");
const API_1 = require("../API");
class Zoro extends Provider_1.default {
    constructor() {
        super("https://zoro.to", API_1.ProviderType.ANIME);
        this.api = `${this.baseURL}/ajax/v2`;
    }
    async search(query) {
        const dom = await this.fetch(`${this.baseURL}/search?keyword=${encodeURIComponent(query)}`);
        const results = [];
        const $ = (0, cheerio_1.load)(dom.text());
        $(".film_list-wrap > div.flw-item").map((index, element) => {
            const title = $(element).find('div.film-detail h3.film-name a.dynamic-name').attr('title').trim().replace(/\\n/g, '');
            const id = $(element).find('div:nth-child(1) > a').last().attr('href');
            const url = this.baseURL + id;
            results.push({
                url,
                title
            });
        });
        return results;
    }
    async getEpisodes(id) {
        const episodes = [];
        const request = await this.fetch(`${this.api}/episode/list/${id.split("-").pop()}`, {
            headers: {
                "X-Requested-With": "XMLHttpRequest",
                Referer: `${this.baseURL}/watch/${id}`
            }
        });
        const $ = (0, cheerio_1.load)(request.json().html);
        $("div.detail-infor-content > div > a").map((index, element) => {
            const number = parseInt($(element).attr('data-number'));
            const title = $(element).attr('title');
            const id = $(element).attr("href");
            const url = this.baseURL + id;
            const episode = {
                id: id,
                url: url,
                title: "Ep. " + number + " - " + title
            };
            episodes.push(episode);
        });
        return episodes;
    }
    async getSources(id, server = Provider_1.StreamingServers.VidCloud) {
        const result = {
            sources: [],
            subtitles: [],
            intro: {
                start: 0,
                end: 0
            }
        };
        if (id.startsWith('http')) {
            const serverUrl = new URL(id);
            switch (server) {
                case Provider_1.StreamingServers.VidStreaming:
                case Provider_1.StreamingServers.VidCloud:
                    return await this.extractVidCloud(serverUrl).catch((err) => {
                        console.error(err);
                        return result;
                    });
                case Provider_1.StreamingServers.StreamSB:
                    return await this.extractStreamSB(serverUrl).catch((err) => {
                        console.error(err);
                        return result;
                    });
                case Provider_1.StreamingServers.StreamTape:
                    return await this.extractStreamTape(serverUrl).catch((err) => {
                        console.error(err);
                        return result;
                    });
                default:
                case Provider_1.StreamingServers.VidCloud:
                    return await this.extractVidCloud(serverUrl).catch((err) => {
                        console.error(err);
                        return result;
                    });
            }
        }
        const subOrDub = id.split('$')?.pop() === 'dub' ? SuborDub.DUB : SuborDub.SUB;
        id = `${this.baseURL}/watch/${id.replace(/\$auto|\$sub|\$dub/gi, '')}`;
        const fetchReq = await this.fetch(`${this.baseURL}/ajax/v2/episode/servers?episodeId=${id.split('?ep=')[1]}`);
        const $ = (0, cheerio_1.load)(fetchReq.json().html);
        /**
         * vidtreaming -> 4
         * rapidcloud  -> 1
         * streamsb -> 5
         * streamtape -> 3
        */
        let serverId = '';
        try {
            switch (server) {
                case Provider_1.StreamingServers.VidCloud:
                    // Index 1 works, but since the m3u8s expire its better to use VidStreaming.
                    serverId = this.retrieveServerId($, /*1*/ 4, subOrDub);
                    if (!serverId)
                        throw new Error('RapidCloud not found');
                    break;
                case Provider_1.StreamingServers.VidStreaming:
                    serverId = this.retrieveServerId($, 4, subOrDub);
                    if (!serverId)
                        throw new Error('vidtreaming not found');
                    break;
                case Provider_1.StreamingServers.StreamSB:
                    serverId = this.retrieveServerId($, 5, subOrDub);
                    if (!serverId)
                        throw new Error('StreamSB not found');
                    break;
                case Provider_1.StreamingServers.StreamTape:
                    serverId = this.retrieveServerId($, 3, subOrDub);
                    if (!serverId)
                        throw new Error('StreamTape not found');
                    break;
            }
        }
        catch (err) {
            throw new Error(err.message);
        }
        const req = await this.fetch(`${this.baseURL}/ajax/v2/episode/sources?id=${serverId}`);
        return await this.getSources(req.json()?.link, server);
    }
    retrieveServerId($, index, subOrDub) {
        return $(`div.ps_-block.ps_-block-sub.servers-${subOrDub} > div.ps__-list > div`).map((i, el) => ($(el).attr('data-server-id') === `${index}` ? $(el) : null)).get()[0]?.attr('data-id');
    }
    ;
}
exports.default = Zoro;
var SuborDub;
(function (SuborDub) {
    SuborDub["SUB"] = "sub";
    SuborDub["DUB"] = "dub";
})(SuborDub || (SuborDub = {}));
//# sourceMappingURL=Zoro.js.map