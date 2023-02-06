import API, { ProviderType } from "./API";
import AniList, { Type, Media, Format } from "./meta/AniList";
import { compareTwoStrings } from "./libraries/StringSimilarity";
import AnimeFox from "./anime/AnimeFox";
import GogoAnime from "./anime/GogoAnime";
import Enime from "./anime/Enime";
import AnimePahe from "./anime/AnimePahe";
import Zoro from "./anime/Zoro";
import ComicK from "./manga/ComicK";
import MangaDex from "./manga/MangaDex";
import Mangakakalot from "./manga/Mangakakalot";
import MangaPark from "./manga/MangaPark";
import MangaSee from "./manga/MangaSee";
import DB from "./db/DB";
import * as colors from "colors";
import { Episode, Page, SubbedSource } from "./Provider";
import AnimeThemes from "./meta/AnimeThemes";
import TMDB from "./meta/TMDB";
import KitsuAnime from "./meta/KitsuAnime";
import KitsuManga from "./meta/KitsuManga";
import LiveChart from "./meta/LiveChart";
import * as dotenv from "dotenv";

export default class Sync extends API {
    public aniList = new AniList();

    private db = new DB();

    public classDictionary:Provider[] = [];

    constructor() {
        super(ProviderType.NONE);

        dotenv.config();

        // Class dictionary of all providers. Used for looping through and searching.
        this.classDictionary = [
            // Zoro has CloudFlare sometimes
            {
                name: "Zoro",
                object: new Zoro(),
            },
            {
                name: "AnimeFox",
                object: new AnimeFox(),
            },
            {
                name: "AnimePahe",
                object: new AnimePahe(),
            },
            {
                name: "Enime",
                object: new Enime(),
            },
            {
                name: "GogoAnime",
                object: new GogoAnime(),
            },
            {
                name: "ComicK",
                object: new ComicK(),
            },
            {
                name: "MangaDex",
                object: new MangaDex(),
            },
            {
                name: "Mangakakalot",
                object: new Mangakakalot(),
            },
            {
                name: "MangaPark",
                object: new MangaPark(),
            },
            {
                name: "MangaSee",
                object: new MangaSee(),
            },
            {
                name: "AnimeThemes",
                object: new AnimeThemes(),
            },
            {
                name: "TMDB",
                object: new TMDB(),
            },
            {
                name: "KitsuAnime",
                object: new KitsuAnime(),
            },
            {
                name: "KitsuManga",
                object: new KitsuManga(),
            },
            // Really high rate limit
            //{
                //name: "LiveChart",
                //object: new LiveChart(),
            //}
        ]
    }

    public async init() {
        await this.db.init();
    }

    /**
     * @description Searches on AniList and on providers and finds the best results possible.
     * @param query Media to search for.
     * @param type Type of media to search for.
     * @returns Promise<FormattedResponse[]>
     */
     public async search(query:string, type:Type): Promise<FormattedResponse[]> {
        let result:FormattedResponse[] = [];
        // Searches first on the database for a result
        const possible = await this.db.search(query, type);
        if (!possible || possible.length === 0) {
            if (this.config.debug) {
                console.log(colors.yellow("No results found in database. Searching providers..."));
                console.log(colors.gray("Searching for ") + colors.blue(query) + colors.gray(" of type ") + colors.blue(type) + colors.gray("..."));
            }
            // Search on AniList first
            const aniSearch = await this.aniSearch(query, type);
            if (this.config.debug) {
                console.log(colors.gray("Received ") + colors.blue("AniList") + colors.gray(" response."));
            }
            const aniList = this.searchCompare(result, aniSearch);
            // Then search on providers
            const pageSearch = await this.pageSearch(query, type);
            if (this.config.debug) {
                console.log(colors.gray("Received ") + colors.blue("Provider") + colors.gray(" response."));
            }
            // Find the best results possible
            const pageList = this.searchCompare(aniList, pageSearch, 0.5);
            await this.db.insert(pageList, type);
            return pageList;
        } else {
            return possible;
        }
    }

    /**
     * @description Searches for media on AniList and maps the results to providers.
     * @param query Media to search for.
     * @param type Type of media to search for.
     * @returns Promise<FormattedResponse[]>
     */
    public async aniSearch(query:string, type:Type): Promise<FormattedResponse[]> {
        const results:SearchResponse[] = [];

        const aniList = await this.aniList.search(query, type);

        const promises = [];
        for (let i = 0; i < this.classDictionary.length; i++) {
            const provider:any = this.classDictionary[i];
            if (provider.object.providerType === type) {
                promises.push(provider.object.search(query));
            }
        }

        const resultsArray = await Promise.all(promises);
        for (let i = 0; i < resultsArray.length; i++) {
            for (let j = 0; j < resultsArray[i].length; j++) {
                let best: any = null;
    
                aniList.map(async (result:any) => {
                    if (type === Type.MANGA) {
                        if (result.format === Format.NOVEL) {
                            return;
                        }
                    }

                    const title = result.title.userPreferred || result.title.romaji || result.title.english || result.title.native;
                    const altTitles:any[] = Object.values(result.title).concat(result.synonyms);
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
    public async pageSearch(query:string, type:Type): Promise<FormattedResponse[]> {
        const results:SearchResponse[] = [];

        const promises = [];
        for (let i = 0; i < this.classDictionary.length; i++) {
            const provider:any = this.classDictionary[i];
            if (provider.object.providerType === type) {
                promises.push(provider.object.search(query));
            }
        }
        const resultsArray = await Promise.all(promises);
        
        for (let i = 0; i < resultsArray.length; i++) {
            for (let j = 0; j < resultsArray[i].length; j++) {
                const aniSearch = await this.aniList.search(this.sanitizeTitle(resultsArray[i][j].title), type);
            
                let best: any = null;

                aniSearch.map(async (result:any) => {
                    const title = result.title.userPreferred || result.title.romaji || result.title.english || result.title.native;
                    const altTitles:any[] = Object.values(result.title).concat(result.synonyms);
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
    public async get(id:string): Promise<FormattedResponse> {
        const aniList = await this.aniList.getMedia(id);
        if (!aniList) {
            return null;
        }
        const possible = await this.db.get(id, aniList.type);
        if (!possible) {
            let result:FormattedResponse = null;
            const results = await this.search(aniList.title.userPreferred, aniList.type);
            for (let i = 0; i < results.length; i++) {
                if (results[i].id === id) {
                    result = results[i];
                }
            }
            return result;
        } else {
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
    public async getSeasonal(type:Type, amount:number, ommitTop:boolean = true, ommitNextSeason:boolean = true): Promise<SeasonalResponse> {
        const data = await this.aniList.getSeasonal(type, 0, amount);

        const results:SeasonalResponse = {
            trending: [],
            season: [],
            nextSeason: [],
            popular: [],
            top: []
        }

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
            } else {
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
            } else {
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
                } else {
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
            } else {
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
                } else {
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
    public async getEpisodes(id:string): Promise<Content[]> {
        const show = await this.get(id);
        if (show.data.type === Type.MANGA) {
            return [];
        }
        const episodes = [];
        const connectors = show.connectors;

        const possible = await this.db.getContent(id, Type.ANIME);
        if (possible != null) {
            const curTime = new Date(Date.now()).getTime();
            const diff = curTime - possible.lastCached;
            if (diff < this.config.cache_timeout && possible.data.length > 0) {
                episodes.push(...possible.data);
                return episodes;
            }
        }

        const promises = [];

        for (let i = 0; i < connectors.length; i++) {
            const connector = connectors[i];
            const promise = new Promise(async(resolve, reject) => {
                const provider = this.fetchProvider(connector.id);
                const object = provider.provider;
                if (object != null && object.providerType === ProviderType.ANIME) {
                    const id = connector.id.split(object.baseURL)[1] ?? connector.id.split(object.api)[1];
                    const fetched = await object.getEpisodes(id).catch((err) => {
                        return null;
                    });
                    if (fetched != null) {
                        episodes.push({
                            provider: provider.provider_name,
                            episodes: fetched
                        })   
                    }
                    resolve(true);
                } else {
                    resolve(true);
                }
            })
            promises.push(promise);
        }
        await Promise.all(promises);
        await this.db.cacheContent(id, episodes, Type.ANIME);
        return episodes;
    }

    /**
     * @description Fetches all chapters for a manga and caches the data
     * @param id AniList ID
     * @returns Promise<Content[]>
     */
    public async getChapters(id:string): Promise<Content[]> {
        const show = await this.get(id);
        if (show.data.type === Type.ANIME) {
            return [];
        }
        const chapters = [];
        const connectors = show.connectors;

        const possible = await this.db.getContent(id, Type.MANGA);
        if (possible != null) {
            const curTime = new Date(Date.now()).getTime();
            const diff = curTime - possible.lastCached;
            if (diff < this.config.cache_timeout && possible.data.length > 0) {
                chapters.push(...possible.data);
                return chapters;
            }
        }

        const promises = [];

        for (let i = 0; i < connectors.length; i++) {
            const connector = connectors[i];
            const promise = new Promise(async(resolve, reject) => {
                const provider = this.fetchProvider(connector.id);
                const object = provider.provider;
                if (object != null && object.providerType === ProviderType.MANGA) {
                    const id = connector.id.split(object.baseURL)[1] ?? connector.id.split(object.api)[1];
                    const fetched = await object.getChapters(id).catch((err) => {
                        return null;
                    });
                    if (fetched != null) {
                        chapters.push({
                            provider: provider.provider_name,
                            chapters: fetched
                        })   
                    }
                    resolve(true);
                } else {
                    resolve(true);
                }
            })
            promises.push(promise);
        }
        await Promise.all(promises);
        await this.db.cacheContent(id, chapters, Type.MANGA);
        return chapters;
    }

    /**
     * @description Fetches sources for a provider and caches it if necessary
     * @param id AniList ID
     * @param providerName Name of the provider
     * @param watchId Watch ID
     * @returns Promise<SubbedSource>
     */
    public async getSources(id:string, providerName:string, watchId:string): Promise<SubbedSource> {
        const provider = this.fetchProviderByName(providerName);
        if (!provider.provider) {
            return null;
        }

        let sources:SubbedSource = null;

        const possible = await this.db.getSources(id, watchId, Type.ANIME);
        if (possible != null) {
            const curTime = new Date(Date.now()).getTime();
            const diff = curTime - possible.lastCached;
            if (possible.data != null) {
                if (provider.provider_name === "Zoro") {
                    // Check if the provider is Zoro. If it is, then you can ignore the cache timeout.
                    sources = possible.data;
                    return sources;
                } else {
                    if (diff < this.config.cache_timeout) {
                        sources = possible.data;
                        return sources;
                    }
                }
            }
        }
        const data = await provider.provider.getSources(watchId);
        sources = data;
        if (sources.sources.length > 0) {
            await this.db.cacheSources(id, watchId, sources, Type.ANIME);
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
    public async getPages(id:string, providerName:string, readId:string): Promise<Page[]> {
        const provider = this.fetchProviderByName(providerName);
        if (!provider.provider) {
            return null;
        }

        let sources:any = null;

        const possible = await this.db.getSources(id, readId, Type.MANGA);
        if (possible != null) {
            const curTime = new Date(Date.now()).getTime();
            const diff = curTime - possible.lastCached;
            if (possible.data != null) {
                if (diff < this.config.cache_timeout) {
                    sources = possible.data;
                    return sources;
                }
            }
        }
        const data = await provider.provider.getPages(readId);
        sources = data;
        if (sources.length > 0) {
            await this.db.cacheSources(id, readId, sources, Type.MANGA);
        }
        return sources;
    }

    /**
     * @description Gets the relations of a media
     * @param id AniList ID
     * @returns [{ data: FormattedResponse, type: Type, relationType: string }]
     */
    public async getRelations(id:string) {
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
                    })
                }
            } else if (relation.node.type === "MANGA") {
                const possible = await this.get(String(relation.node.id));
                if (possible != undefined) {
                    results.push({
                        data: possible,
                        type: "MANGA",
                        relationType: relation.relationType,
                    })
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
     public async crawl(type:Type, maxIds?:number): Promise<FormattedResponse[]> {

        const results = [];

        let ids = [];
        if (type === Type.ANIME) {
            ids = await this.aniList.getAnimeIDs();
        } else if (type === Type.MANGA) {
            ids = await this.aniList.getMangaIDs();
        } else {
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
                    if (this.config.debug) {
                        console.log(colors.red("Error fetching ID: ") + colors.white(ids[i] + ""));
                    }
                    return null;
                });
                if (data) {
                    const result = await this.get(ids[i]).catch((err) => {
                        if (this.config.debug) {
                            console.log(colors.red("Error fetching ID from providers: ") + colors.white(ids[i] + ""));
                            console.log(colors.gray(err.message));
                        }
                        return null;
                    });
                    if (result) {
                        results.push(result);
                    }
                }
                if (this.config.debug) {
                    const end = new Date(Date.now());
                    console.log(colors.gray("Finished fetching data. Request(s) took ") + colors.cyan(String(end.getTime() - start.getTime())) + colors.gray(" milliseconds."));
                    console.log(colors.green("Fetched ID ") + colors.blue("#" + (i + 1) + "/" + maxIds));
                }
            }
        }

        if (this.config.debug) {
            console.log(colors.green("Crawling finished."));
        }
        return results;
    }

    public async getRecentEpisodes(): Promise<FormattedResponse[]> {
        let results = [];
        const gogo = new GogoAnime();
        const anime = await gogo.fetchRecentEpisodes();
        for (let i = 0; i < anime.length; i++) {
            const gogoTitle = this.sanitizeTitle(anime[i].title);
            const possible = await this.aniList.search(gogoTitle, Type.ANIME);
            if (possible.length > 0) {
                let best: any = null;

                possible.map(async (result:any) => {
                    const title = result.title.userPreferred;
                    const altTitles:any[] = Object.values(result.title).concat(result.synonyms);
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
    private formatSearch(results:SearchResponse[]): FormattedResponse[] {
        const formatted:FormattedResponse[] = [];

        for (let i = 0; i < results.length; i++) {
            const item:any = results[i];
            let hasPushed = false;
            for (let j = 0; j < formatted.length; j++) {
                if (formatted[j].data.id === item.data.id) {
                    hasPushed = true;
                    formatted[j].connectors.push(
                        {
                            id: item.id,
                            similarity: item.similarity
                        }
                    ); 
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
    public similarity(externalTitle, title, titleArray: string[] = []): { same: boolean, value: number } {
        let simi = compareTwoStrings(this.sanitizeTitle(title.toLowerCase()), externalTitle.toLowerCase());
        titleArray.forEach(el => {
            if (el) {
                const tempSimi = compareTwoStrings(title.toLowerCase(), el.toLowerCase());
                if (tempSimi > simi) simi = tempSimi;
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
    public sanitizeTitle(title):string {
        let resTitle = title.replace(
            / *(\(dub\)|\(sub\)|\(uncensored\)|\(uncut\)|\(subbed\)|\(dubbed\))/i,
            '',
        );
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
     private searchCompare(curVal:FormattedResponse[], newVal:FormattedResponse[], threshold = 0):FormattedResponse[] {
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
                                    } else {
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
        if (curVal.length > 0) return curVal;
        return newVal;
    }

    /**
     * @description Gets all media cached
     * @param type Type of media to get
     * @returns Promise<FormattedResponse[]>
     */
    public async getAll(type:Type): Promise<FormattedResponse[]> {
        const data = await this.db.getAll(type);
        return data;
    }

    /**
     * @description Exports the database to a JSON file.
     * @param type Type of media to export
     */
    public async export(type:Type): Promise<void> {
        await this.db.export(type);
    }

    /**
     * @description Converts the provider to it's object
     * @param url URL of a provider
     * @returns any
     */
    private fetchProvider(url:string): { provider_name: string, provider: any } {
        let provider = null;
        let providerName = "";
        this.classDictionary.map((el, index) => {
            if (url.startsWith(el.object.baseURL) || url.startsWith(el.object.api)) {
                provider = el.object;
                providerName = el.name;
            }
        })
        return {
            provider_name: providerName,
            provider: provider
        };
    }
    
    private fetchProviderByName(name:string): { provider_name: string, provider: any } {
        let provider = null;
        let providerName = "";
        this.classDictionary.map((el, index) => {
            if (el.name.toLowerCase() === name.toLowerCase()) {
                provider = el.object;
                providerName = el.name;
            }
        })
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
    public async getImage(url: string, options: {}): Promise<any> {
        const data = await this.fetch(url, {
            method: "GET",
            responseType: 'arraybuffer',
            ...options,
        });
        return data.raw().data;
    }
}

interface Result {
    title: string;
    altTitles?: string[];
    url: string;
}

interface Provider {
    name: string;
    object: any;
}

interface FormattedResponse {
    id: string;
    data: Media;
    connectors: any[];
}

interface SearchResponse {
    id: string; // The provider's URL
    data: Media;
    similarity: {
        same: boolean;
        value: number;
    };
}

interface SeasonalResponse {
    trending: Array<FormattedResponse>;
    season: Array<FormattedResponse>;
    nextSeason: Array<FormattedResponse>;
    popular: Array<FormattedResponse>;
    top: Array<FormattedResponse>;
}

interface Content {
    provider: string;
    episodes: Episode[]
}

export type { Result, Provider, FormattedResponse, SearchResponse, Content };