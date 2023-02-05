"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const API_1 = require("./API");
const AniList_1 = require("./meta/AniList");
const StringSimilarity_1 = require("./libraries/StringSimilarity");
const AnimeFox_1 = require("./anime/AnimeFox");
const GogoAnime_1 = require("./anime/GogoAnime");
const Enime_1 = require("./anime/Enime");
const AnimePahe_1 = require("./anime/AnimePahe");
const Zoro_1 = require("./anime/Zoro");
const ComicK_1 = require("./manga/ComicK");
const MangaDex_1 = require("./manga/MangaDex");
const Mangakakalot_1 = require("./manga/Mangakakalot");
const MangaPark_1 = require("./manga/MangaPark");
const MangaSee_1 = require("./manga/MangaSee");
const DB_1 = require("./DB");
const config = require("./config.json");
const colors = require("colors");
class Sync extends API_1.default {
    constructor() {
        super(API_1.ProviderType.NONE);
        this.aniList = new AniList_1.default();
        this.db = new DB_1.default();
        this.classDictionary = [];
        // Class dictionary of all providers. Used for looping through and searching.
        this.classDictionary = [
            // Zoro has CloudFlare sometimes
            {
                name: "Zoro",
                object: new Zoro_1.default(),
            },
            {
                name: "AnimeFox",
                object: new AnimeFox_1.default(),
            },
            {
                name: "AnimePahe",
                object: new AnimePahe_1.default(),
            },
            {
                name: "Enime",
                object: new Enime_1.default(),
            },
            {
                name: "GogoAnime",
                object: new GogoAnime_1.default(),
            },
            {
                name: "ComicK",
                object: new ComicK_1.default(),
            },
            {
                name: "MangaDex",
                object: new MangaDex_1.default(),
            },
            {
                name: "Mangakakalot",
                object: new Mangakakalot_1.default(),
            },
            {
                name: "MangaPark",
                object: new MangaPark_1.default(),
            },
            {
                name: "MangaSee",
                object: new MangaSee_1.default(),
            }
        ];
    }
    async init() {
        await this.db.init();
    }
    /**
     * @description Searches on AniList and on providers and finds the best results possible.
     * @param query Media to search for.
     * @param type Type of media to search for.
     * @returns Promise<FormattedResponse[]>
     */
    async search(query, type) {
        let result = [];
        // Searches first on the database for a result
        const possible = await this.db.search(query, type);
        if (!possible || possible.length === 0) {
            if (config.debug) {
                console.log(colors.yellow("No results found in database. Searching providers..."));
                console.log(colors.gray("Searching for ") + colors.blue(query) + colors.gray(" of type ") + colors.blue(type) + colors.gray("..."));
            }
            // Search on AniList first
            const aniSearch = await this.aniSearch(query, type);
            if (config.debug) {
                console.log(colors.gray("Received ") + colors.blue("AniList") + colors.gray(" response."));
            }
            const aniList = this.searchCompare(result, aniSearch);
            // Then search on providers
            const pageSearch = await this.pageSearch(query, type);
            if (config.debug) {
                console.log(colors.gray("Received ") + colors.blue("Provider") + colors.gray(" response."));
            }
            // Find the best results possible
            const pageList = this.searchCompare(aniList, pageSearch, 0.5);
            await this.db.insert(pageList, type);
            return pageList;
        }
        else {
            return possible;
        }
    }
    /**
     * @description Searches for media on AniList and maps the results to providers.
     * @param query Media to search for.
     * @param type Type of media to search for.
     * @returns Promise<FormattedResponse[]>
     */
    async aniSearch(query, type) {
        const results = [];
        const aniList = await this.aniList.search(query, type);
        const promises = [];
        for (let i = 0; i < this.classDictionary.length; i++) {
            const provider = this.classDictionary[i];
            if (provider.object.providerType === type) {
                promises.push(provider.object.search(query));
            }
        }
        const resultsArray = await Promise.all(promises);
        for (let i = 0; i < resultsArray.length; i++) {
            for (let j = 0; j < resultsArray[i].length; j++) {
                let best = null;
                aniList.map(async (result) => {
                    const title = result.title.userPreferred;
                    const altTitles = Object.values(result.title).concat(result.synonyms);
                    const aniList = result;
                    const sim = this.similarity(title, resultsArray[i][j].title, altTitles);
                    const tempBest = {
                        index: j,
                        similarity: sim,
                        aniList: aniList,
                    };
                    if (!best || sim.value > best.similarity.value) {
                        best = tempBest;
                    }
                });
                if (best) {
                    const retEl = resultsArray[i][best.index];
                    results.push({
                        id: retEl.url,
                        data: best.aniList,
                        similarity: best.similarity,
                    });
                }
            }
        }
        return this.formatSearch(results);
    }
    /**
     * @description Searches for media on all providers and maps the results to AniList.
     * @param query Media to search for.
     * @param type Type of media to search for.
     * @returns Promise<FormattedResponse[]>
     */
    async pageSearch(query, type) {
        const results = [];
        const promises = [];
        for (let i = 0; i < this.classDictionary.length; i++) {
            const provider = this.classDictionary[i];
            if (provider.object.providerType === type) {
                promises.push(provider.object.search(query));
            }
        }
        const resultsArray = await Promise.all(promises);
        for (let i = 0; i < resultsArray.length; i++) {
            for (let j = 0; j < resultsArray[i].length; j++) {
                const aniSearch = await this.aniList.search(this.sanitizeTitle(resultsArray[i][j].title), type);
                let best = null;
                aniSearch.map(async (result) => {
                    const title = result.title.userPreferred;
                    const altTitles = Object.values(result.title).concat(result.synonyms);
                    const aniList = result;
                    const sim = this.similarity(title, resultsArray[i][j].title, altTitles);
                    const tempBest = {
                        index: j,
                        similarity: sim,
                        aniList: aniList,
                    };
                    if (!best || sim.value > best.similarity.value) {
                        best = tempBest;
                    }
                });
                if (best) {
                    const retEl = resultsArray[i][best.index];
                    results.push({
                        id: retEl.url,
                        data: best.aniList,
                        similarity: best.similarity,
                    });
                }
            }
        }
        let data = this.formatSearch(results);
        return data;
    }
    /**
     *
     * @param id AniList ID of the media to get
     * @returns
     */
    async get(id) {
        const aniList = await this.aniList.getMedia(id);
        if (!aniList) {
            return null;
        }
        const possible = await this.db.get(id, aniList.type);
        if (!possible) {
            let result = null;
            const results = await this.search(aniList.title.userPreferred, aniList.type);
            for (let i = 0; i < results.length; i++) {
                if (results[i].id === id) {
                    result = results[i];
                }
            }
            return result;
        }
        else {
            return possible;
        }
    }
    /**
     *
     * @param type Type of media to query
     * @param amount Amount of media to get
     * @param ommitTop Ommits data for top since there will sometimes be new shows that aren't in the database
     * @param ommitNextSeason Ommits data for next season (since there likely won't be any valid results)
     */
    async getSeasonal(type, amount, ommitTop = true, ommitNextSeason = true) {
        const data = await this.aniList.getSeasonal(type, 0, amount);
        const results = {
            trending: [],
            season: [],
            nextSeason: [],
            popular: [],
            top: []
        };
        const trending = data.data.trending.media;
        const season = data.data.season.media;
        const nextSeason = data.data.nextSeason.media;
        const popular = data.data.popular.media;
        const top = data.data.top.media;
        for (let i = 0; i < trending.length; i++) {
            const media = trending[i];
            const possible = await this.db.get(String(media.id), type);
            if (!possible) {
                const result = await this.get(String(media.id));
                this.db.insert([result], type);
                results.trending.push(result);
            }
            else {
                results.trending.push(possible);
            }
        }
        for (let i = 0; i < season.length; i++) {
            const media = season[i];
            const possible = await this.db.get(String(media.id), type);
            if (!possible) {
                const result = await this.get(String(media.id));
                this.db.insert([result], type);
                results.season.push(result);
            }
            else {
                results.season.push(possible);
            }
        }
        if (!ommitNextSeason) {
            for (let i = 0; i < nextSeason.length; i++) {
                const media = nextSeason[i];
                const possible = await this.db.get(String(media.id), type);
                if (!possible) {
                    const result = await this.get(String(media.id));
                    this.db.insert([result], type);
                    results.nextSeason.push(result);
                }
                else {
                    results.nextSeason.push(possible);
                }
            }
        }
        for (let i = 0; i < popular.length; i++) {
            const media = popular[i];
            const possible = await this.db.get(String(media.id), type);
            if (!possible) {
                const result = await this.get(String(media.id));
                this.db.insert([result], type);
                results.popular.push(result);
            }
            else {
                results.popular.push(possible);
            }
        }
        if (!ommitTop) {
            for (let i = 0; i < top.length; i++) {
                const media = top[i];
                const possible = await this.db.get(String(media.id), type);
                if (!possible) {
                    const result = await this.get(String(media.id));
                    this.db.insert([result], type);
                    results.top.push(result);
                }
                else {
                    results.top.push(possible);
                }
            }
        }
        return results;
    }
    /**
     * @description Fetches all episodes for a show and caches the data
     * @param id AniList ID
     * @returns Promise<Content[]>
     */
    async getEpisodes(id) {
        const show = await this.get(id);
        if (show.data.type === AniList_1.Type.MANGA) {
            return [];
        }
        const episodes = [];
        const connectors = show.connectors;
        const possible = await this.db.getContent(id, AniList_1.Type.ANIME);
        if (possible != null) {
            const curTime = new Date(Date.now()).getTime();
            const diff = curTime - possible.lastCached;
            if (diff < config.cache_timeout && possible.data.length > 0) {
                episodes.push(...possible.data);
                return episodes;
            }
        }
        const promises = [];
        for (let i = 0; i < connectors.length; i++) {
            const connector = connectors[i];
            const promise = new Promise(async (resolve, reject) => {
                const provider = this.fetchProvider(connector.id);
                const object = provider.provider;
                if (object != null && object.providerType === API_1.ProviderType.ANIME) {
                    const id = connector.id.split(object.baseURL)[1] ?? connector.id.split(object.api)[1];
                    const fetched = await object.getEpisodes(id).catch((err) => {
                        return null;
                    });
                    if (fetched != null) {
                        episodes.push({
                            provider: provider.provider_name,
                            episodes: fetched
                        });
                    }
                    resolve(true);
                }
                else {
                    resolve(true);
                }
            });
            promises.push(promise);
        }
        await Promise.all(promises);
        await this.db.cacheContent(id, episodes, AniList_1.Type.ANIME);
        return episodes;
    }
    /**
     * @description Fetches all chapters for a manga and caches the data
     * @param id AniList ID
     * @returns Promise<Content[]>
     */
    async getChapters(id) {
        const show = await this.get(id);
        if (show.data.type === AniList_1.Type.ANIME) {
            return [];
        }
        const chapters = [];
        const connectors = show.connectors;
        const possible = await this.db.getContent(id, AniList_1.Type.MANGA);
        if (possible != null) {
            const curTime = new Date(Date.now()).getTime();
            const diff = curTime - possible.lastCached;
            if (diff < config.cache_timeout && possible.data.length > 0) {
                chapters.push(...possible.data);
                return chapters;
            }
        }
        const promises = [];
        for (let i = 0; i < connectors.length; i++) {
            const connector = connectors[i];
            const promise = new Promise(async (resolve, reject) => {
                const provider = this.fetchProvider(connector.id);
                const object = provider.provider;
                if (object != null && object.providerType === API_1.ProviderType.MANGA) {
                    const id = connector.id.split(object.baseURL)[1] ?? connector.id.split(object.api)[1];
                    const fetched = await object.getChapters(id).catch((err) => {
                        return null;
                    });
                    if (fetched != null) {
                        chapters.push({
                            provider: provider.provider_name,
                            chapters: fetched
                        });
                    }
                    resolve(true);
                }
                else {
                    resolve(true);
                }
            });
            promises.push(promise);
        }
        await Promise.all(promises);
        await this.db.cacheContent(id, chapters, AniList_1.Type.MANGA);
        return chapters;
    }
    /**
     * @description Fetches sources for a provider and caches it if necessary
     * @param id AniList ID
     * @param providerName Name of the provider
     * @param watchId Watch ID
     * @returns Promise<SubbedSource>
     */
    async getSources(id, providerName, watchId) {
        const provider = this.fetchProviderByName(providerName);
        if (!provider.provider) {
            return null;
        }
        let sources = null;
        const possible = await this.db.getSources(id, watchId, AniList_1.Type.ANIME);
        if (possible != null) {
            const curTime = new Date(Date.now()).getTime();
            const diff = curTime - possible.lastCached;
            if (possible.data != null) {
                if (provider.provider_name === "Zoro") {
                    // Check if the provider is Zoro. If it is, then you can ignore the cache timeout.
                    sources = possible.data;
                    return sources;
                }
                else {
                    if (diff < config.cache_timeout) {
                        sources = possible.data;
                        return sources;
                    }
                }
            }
        }
        const data = await provider.provider.getSources(watchId);
        sources = data;
        if (sources.sources.length > 0) {
            await this.db.cacheSources(id, watchId, sources, AniList_1.Type.ANIME);
        }
        return sources;
    }
    /**
     * @description Fetches pages for a provider and caches it if necessary
     * @param id AniList ID
     * @param providerName Name of the provider
     * @param readId Read ID
     * @returns Promise<SubbedSource>
     */
    async getPages(id, providerName, readId) {
        const provider = this.fetchProviderByName(providerName);
        if (!provider.provider) {
            return null;
        }
        let sources = null;
        const possible = await this.db.getSources(id, readId, AniList_1.Type.MANGA);
        if (possible != null) {
            const curTime = new Date(Date.now()).getTime();
            const diff = curTime - possible.lastCached;
            if (possible.data != null) {
                if (diff < config.cache_timeout) {
                    sources = possible.data;
                    return sources;
                }
            }
        }
        const data = await provider.provider.getPages(readId);
        sources = data;
        if (sources.length > 0) {
            await this.db.cacheSources(id, readId, sources, AniList_1.Type.MANGA);
        }
        return sources;
    }
    /**
     * @description Gets the relations of a media
     * @param id AniList ID
     * @returns [{ data: FormattedResponse, type: Type, relationType: string }]
     */
    async getRelations(id) {
        const info = await this.get(id);
        if (!info) {
            return null;
        }
        const results = [];
        const relations = info.data.relations;
        for (let i = 0; i < relations.edges.length; i++) {
            const relation = relations.edges[i];
            if (relation.node.type === "ANIME") {
                const possible = await this.get(String(relation.node.id));
                if (possible != undefined) {
                    results.push({
                        data: possible,
                        type: "ANIME",
                        relationType: relation.relationType,
                    });
                }
            }
            else if (relation.node.type === "MANGA") {
                const possible = await this.get(String(relation.node.id));
                if (possible != undefined) {
                    results.push({
                        data: possible,
                        type: "MANGA",
                        relationType: relation.relationType,
                    });
                }
            }
        }
        return results;
    }
    /**
     * @description Crawls the provider for media.
     * @param type Type of media to crawl
     * @param maxIds Max IDs to crawl
     * @returns Promise<any>
     */
    async crawl(type, maxIds) {
        const results = [];
        let ids = [];
        if (type === AniList_1.Type.ANIME) {
            ids = await this.aniList.getAnimeIDs();
        }
        else if (type === AniList_1.Type.MANGA) {
            ids = await this.aniList.getMangaIDs();
        }
        else {
            throw new Error("Unknown type.");
        }
        maxIds = maxIds ? maxIds : ids.length;
        for (let i = 0; i < ids.length || maxIds; i++) {
            if (i >= maxIds) {
                break;
            }
            const possible = await this.db.get(ids[i], type);
            if (!possible) {
                const start = new Date(Date.now());
                const data = await this.aniList.getMedia(ids[i]).catch((err) => {
                    if (config.debug) {
                        console.log(colors.red("Error fetching ID: ") + colors.white(ids[i] + ""));
                    }
                    return null;
                });
                if (data) {
                    const result = await this.get(ids[i]).catch((err) => {
                        if (config.debug) {
                            console.log(colors.red("Error fetching ID from providers: ") + colors.white(ids[i] + ""));
                            console.log(colors.gray(err.message));
                        }
                        return null;
                    });
                    if (result) {
                        results.push(result);
                    }
                }
                if (config.debug) {
                    const end = new Date(Date.now());
                    console.log(colors.gray("Finished fetching data. Request(s) took ") + colors.cyan(String(end.getTime() - start.getTime())) + colors.gray(" milliseconds."));
                    console.log(colors.green("Fetched ID ") + colors.blue("#" + (i + 1) + "/" + maxIds));
                }
            }
        }
        if (config.debug) {
            console.log(colors.green("Crawling finished."));
        }
        return results;
    }
    async getRecentEpisodes() {
        let results = [];
        const gogo = new GogoAnime_1.default();
        const anime = await gogo.fetchRecentEpisodes();
        for (let i = 0; i < anime.length; i++) {
            const gogoTitle = this.sanitizeTitle(anime[i].title);
            const possible = await this.aniList.search(gogoTitle, AniList_1.Type.ANIME);
            if (possible.length > 0) {
                let best = null;
                possible.map(async (result) => {
                    const title = result.title.userPreferred;
                    const altTitles = Object.values(result.title).concat(result.synonyms);
                    const aniList = result;
                    const sim = this.similarity(title, gogoTitle, altTitles);
                    const tempBest = {
                        index: i,
                        similarity: sim,
                        aniList: aniList,
                    };
                    if (!best || sim.value > best.similarity.value) {
                        best = tempBest;
                    }
                });
                if (best) {
                    const retEl = anime[best.index];
                    results.push({
                        id: retEl.url,
                        data: best.aniList,
                        similarity: best.similarity,
                    });
                }
            }
        }
        const temp = this.formatSearch(results);
        results = [];
        for (let i = 0; i < temp.length; i++) {
            const id = temp[i].id;
            const data = await this.get(id);
            if (data) {
                results.push(data);
            }
        }
        return results;
    }
    /**
    * @description Formats search responses so that all connectors are assigned to one AniList media object.
    * @param results Search results
    * @returns FormattedResponse[]
    */
    formatSearch(results) {
        const formatted = [];
        for (let i = 0; i < results.length; i++) {
            const item = results[i];
            let hasPushed = false;
            for (let j = 0; j < formatted.length; j++) {
                if (formatted[j].data.id === item.data.id) {
                    hasPushed = true;
                    formatted[j].connectors.push({
                        id: item.id,
                        similarity: item.similarity
                    });
                }
            }
            if (!hasPushed) {
                item.connectors = [
                    {
                        id: item.id,
                        similarity: item.similarity
                    }
                ];
                item.id = item.data.id;
                const temp = {
                    id: item.id,
                    data: item.data,
                    connectors: item.connectors,
                };
                formatted.push(temp);
            }
        }
        return formatted;
    }
    /**
     * @description Compares the similarity between the external title and the title from the provider.
     * @param externalTitle Title from AniList/MAL
     * @param title Title from provider
     * @param titleArray Alt titles from provider
     * @returns { same: boolean, value: number }
     */
    similarity(externalTitle, title, titleArray = []) {
        let simi = (0, StringSimilarity_1.compareTwoStrings)(this.sanitizeTitle(title.toLowerCase()), externalTitle.toLowerCase());
        titleArray.forEach(el => {
            if (el) {
                const tempSimi = (0, StringSimilarity_1.compareTwoStrings)(title.toLowerCase(), el.toLowerCase());
                if (tempSimi > simi)
                    simi = tempSimi;
            }
        });
        let found = false;
        if (simi > 0.6) {
            found = true;
        }
        return {
            same: found,
            value: simi,
        };
    }
    /**
     * @description Used for removing unnecessary information from the title.
     * @param title Title to sanitize.
     * @returns string
     */
    sanitizeTitle(title) {
        let resTitle = title.replace(/ *(\(dub\)|\(sub\)|\(uncensored\)|\(uncut\)|\(subbed\)|\(dubbed\))/i, '');
        resTitle = resTitle.replace(/ *\([^)]+audio\)/i, '');
        resTitle = resTitle.replace(/ BD( |$)/i, '');
        resTitle = resTitle.replace(/\(TV\)/g, '');
        resTitle = resTitle.trim();
        resTitle = resTitle.substring(0, 99); // truncate
        return resTitle;
    }
    /**
     * @description Compares two responses and replaces results that have a better response
     * @param curVal Original response
     * @param newVal New response to compare
     * @param threshold Optional minimum threshold required
     * @returns FormattedResponse[]
     */
    searchCompare(curVal, newVal, threshold = 0) {
        const res = [];
        if (curVal.length > 0 && newVal.length > 0) {
            for (let i = 0; i < curVal.length; i++) {
                for (let j = 0; j < newVal.length; j++) {
                    if (curVal[i].id === newVal[j].id) {
                        // Can compare now
                        const connectors = [];
                        for (let k = 0; k < curVal[i].connectors.length; k++) {
                            for (let l = 0; l < newVal[j].connectors.length; l++) {
                                if (curVal[i].connectors[k].id === newVal[j].connectors[l].id) {
                                    // Compare similarity
                                    if (newVal[j].connectors[l].similarity < threshold || curVal[i].connectors[k].similarity.value >= newVal[j].connectors[l].similarity.value) {
                                        connectors.push(curVal[i].connectors[k]);
                                    }
                                    else {
                                        connectors.push(newVal[j].connectors[l]);
                                    }
                                }
                            }
                        }
                        res.push({
                            id: curVal[i].id,
                            data: curVal[i].data,
                            connectors,
                        });
                    }
                }
            }
            return res;
        }
        if (curVal.length > 0)
            return curVal;
        return newVal;
    }
    /**
     * @description Gets all media cached
     * @param type Type of media to get
     * @returns Promise<FormattedResponse[]>
     */
    async getAll(type) {
        const data = await this.db.getAll(type);
        return data;
    }
    /**
     * @description Exports the database to a JSON file.
     * @param type Type of media to export
     */
    async export(type) {
        await this.db.export(type);
    }
    /**
     * @description Converts the provider to it's object
     * @param url URL of a provider
     * @returns any
     */
    fetchProvider(url) {
        let provider = null;
        let providerName = "";
        this.classDictionary.map((el, index) => {
            if (url.startsWith(el.object.baseURL) || url.startsWith(el.object.api)) {
                provider = el.object;
                providerName = el.name;
            }
        });
        return {
            provider_name: providerName,
            provider: provider
        };
    }
    fetchProviderByName(name) {
        let provider = null;
        let providerName = "";
        this.classDictionary.map((el, index) => {
            if (el.name.toLowerCase() === name.toLowerCase()) {
                provider = el.object;
                providerName = el.name;
            }
        });
        return {
            provider_name: providerName,
            provider: provider
        };
    }
    /**
     * @description Sends a request to an image and returns an array buffer
     * @param url Image URL
     * @param options axios options
     * @returns Array Buffer
     */
    async getImage(url, options) {
        const data = await this.fetch(url, {
            method: "GET",
            responseType: 'arraybuffer',
            ...options,
        });
        return data.raw().data;
    }
}
exports.default = Sync;
//# sourceMappingURL=Anify.js.map