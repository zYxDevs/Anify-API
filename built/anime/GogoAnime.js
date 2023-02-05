"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cheerio_1 = require("cheerio");
const Provider_1 = require("../Provider");
const API_1 = require("../API");
class GogoAnime extends Provider_1.default {
    constructor() {
        super("https://www1.gogoanime.bid", API_1.ProviderType.ANIME);
        this.api = "https://ajax.gogo-load.com/ajax";
    }
    async search(query) {
        const dom = await this.fetch(`${this.baseURL}/search.html?keyword=${encodeURIComponent(query)}`);
        const results = [];
        const $ = (0, cheerio_1.load)(dom.text());
        $("div.last_episodes > ul > li").map((index, element) => {
            const title = $(element).find('p.name > a').attr('title');
            const id = "/category/" + $(element).find('p.name > a').attr('href')?.split('/')[2];
            const url = this.baseURL + id;
            results.push({
                url,
                title: title
            });
        });
        return results;
    }
    async getEpisodes(id) {
        const episodes = [];
        const dom = await this.fetch(`${this.baseURL}${id}`);
        const $ = (0, cheerio_1.load)(dom.text());
        const ep_start = $('#episode_page > li').first().find('a').attr('ep_start');
        const ep_end = $('#episode_page > li').last().find('a').attr('ep_end');
        const movie_id = $('#movie_id').attr('value');
        const alias = $('#alias_anime').attr('value');
        const html = await this.fetch(`${this.api}/load-list-episode?ep_start=${ep_start}&ep_end=${ep_end}&id=${movie_id}&default_ep=${0}&alias=${alias}`);
        const $$ = (0, cheerio_1.load)(html.text());
        $$('#episode_related > li').each((i, el) => {
            episodes?.push({
                id: $(el).find('a').attr('href')?.trim(),
                number: parseFloat($(el).find(`div.name`).text().replace('EP ', '')),
                url: `${this.baseURL}${$(el).find(`a`).attr('href')?.trim()}`,
                title: $(el).find(`div.name`).text()
            });
        });
        return episodes;
    }
    async getSources(id, server = Provider_1.StreamingServers.VidStreaming) {
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
            const download = `https://gogohd.net/download${serverUrl.search}`;
            switch (server) {
                case Provider_1.StreamingServers.GogoCDN:
                    return await this.extractGogoCDN(serverUrl).catch((err) => {
                        console.error(err);
                        return result;
                    });
                case Provider_1.StreamingServers.StreamSB:
                    return await this.extractStreamSB(serverUrl).catch((err) => {
                        console.error(err);
                        return result;
                    });
                default:
                    return await this.extractGogoCDN(serverUrl).catch((err) => {
                        console.error(err);
                        return result;
                    });
            }
        }
        try {
            const res = await this.fetch(`${this.baseURL}${id}`);
            const $ = (0, cheerio_1.load)(res.text());
            let serverUrl;
            switch (server) {
                case Provider_1.StreamingServers.GogoCDN:
                    serverUrl = new URL(`https:${$('#load_anime > div > div > iframe').attr('src')}`);
                    break;
                case Provider_1.StreamingServers.VidStreaming:
                    serverUrl = new URL(`https:${$('div.anime_video_body > div.anime_muti_link > ul > li.vidcdn > a').attr('data-video')}`);
                    break;
                case Provider_1.StreamingServers.StreamSB:
                    serverUrl = new URL($('div.anime_video_body > div.anime_muti_link > ul > li.streamsb > a').attr('data-video'));
                    break;
                default:
                    serverUrl = new URL(`https:${$('#load_anime > div > div > iframe').attr('src')}`);
                    break;
            }
            return await this.getSources(serverUrl.href, server);
        }
        catch (err) {
            console.error(err);
            throw new Error('Episode not found.');
        }
    }
    async fetchRecentEpisodes(page = 1, type = 1) {
        try {
            const res = await this.fetch(`${this.api}/page-recent-release.html?page=${page}&type=${type}`);
            const $ = (0, cheerio_1.load)(res.text());
            const recentEpisodes = [];
            $('div.last_episodes.loaddub > ul > li').each((i, el) => {
                recentEpisodes.push({
                    id: $(el).find('a').attr('href')?.split('/')[1]?.split('-episode')[0],
                    episodeId: $(el).find('a').attr('href')?.split('/')[1],
                    episodeNumber: parseInt($(el).find('p.episode').text().replace('Episode ', '')),
                    title: $(el).find('p.name > a').attr('title'),
                    image: $(el).find('div > a > img').attr('src'),
                    url: `${this.baseURL}${$(el).find('a').attr('href')?.trim()}`,
                });
            });
            const hasNextPage = !$('div.anime_name_pagination.intro > div > ul > li').last().hasClass('selected');
            return recentEpisodes;
        }
        catch (err) {
            throw new Error('Something went wrong. Please try again later.');
        }
    }
    ;
}
exports.default = GogoAnime;
//# sourceMappingURL=GogoAnime.js.map