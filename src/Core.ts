import API, { ProviderType } from "./API";
import AniList, { Type, Media, Format } from "./meta/AniList";
import { compareTwoStrings, findBestMatch } from "./libraries/StringSimilarity";
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
import AnimeThemes, { Theme } from "./meta/AnimeThemes";
import TMDB from "./meta/TMDB";
import KitsuAnime from "./meta/KitsuAnime";
import KitsuManga from "./meta/KitsuManga";
import LiveChart from "./meta/LiveChart";
import * as dotenv from "dotenv";
import Chiaki from "./meta/Chiaki";

export default class Core extends API {
    public aniList = new AniList();

    private db = new DB();

    public classDictionary:Provider[] = [];

    constructor(options?:Options) {
        super(ProviderType.NONE, options);
        if (options && options.is_sqlite) {
            this.db = new DB(options.is_sqlite);
        }

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
            //},
            {
                name: "Chiaki",
                object: new Chiaki(),
            }
        ]
    }

    /**
     * @description Initializes the database
     */
    public async init() {
        await this.db.init();
    }

    /**
     * @description Searches on AniList and on providers and finds the best results possible. Less accurate but a lot faster.
     * @param query Media to search for.
     * @param type Type of media to search for.
     * @returns Promise<FormattedResponse[]>
     */
     public async search(query:string, type:Type): Promise<FormattedResponse[]> {
        // Searches first on the database for a result
        const possible = await this.db.search(query, type);
        if (!possible || possible.length === 0) {
            if (this.config.debug) {
                console.log(colors.yellow("No results found in database. Searching providers..."));
                console.log(colors.gray("Searching for ") + colors.blue(query) + colors.gray(" of type ") + colors.blue(type) + colors.gray("..."));
            }
            const aniSearch = await this.aniSearch(query, type);
            if (this.config.debug) {
                console.log(colors.gray("Received ") + colors.blue("AniList") + colors.gray(" response."));
            }

            const temp = [];
            for (let i = 0; i < aniSearch.length; i++) {
                const dbQuery = await this.db.get(String(aniSearch[i].id), type);
                if (dbQuery != null) {
                    temp.push(dbQuery);
                }
            }
            if (temp.length > 0) {
                return temp;
            }

            const results = await this.testSearch(query, type);
            if (this.config.debug) {
                console.log(colors.gray("Received ") + colors.blue("Provider") + colors.gray(" response."));
            }

            const res = this.searchCompare(aniSearch, results, 0.5);

            const malSync = await this.malSync(query, type);
            if (this.config.debug) {
                console.log(colors.gray("Received ") + colors.blue("MALSync") + colors.gray(" response."));
            }

            const final = this.searchCompareSoft(res, malSync, 0.5);
            this.db.insert(final, type);
            return final;
        } else {
            return possible;
        }
    }

    /**
     * @description Searches on AniList and on providers and finds the best results possible. Very accurate but a lot slower.
     * @param query Media to search for.
     * @param type Type of media to search for.
     * @returns Promise<FormattedResponse[]>
     */
    public async searchAlt(query:string, type:Type): Promise<FormattedResponse[]> {
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

            const temp = [];
            for (let i = 0; i < aniSearch.length; i++) {
                const dbQuery = await this.db.get(String(aniSearch[i].id), type);
                if (dbQuery != null) {
                    temp.push(dbQuery);
                }
            }
            if (temp.length > 0) {
                return temp;
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
     * @description Searches on AniList first then maps each item to a provider. Finds the best results and returns a list of data.
     * @param query Media to search for.
     * @param type Type of media to search for.
     * @returns Promise<FormattedResponse[]>
     */
    private async testSearch(query:string, type:Type): Promise<FormattedResponse[]> {
        const aniList = await this.aniList.search(query, type);

        const results:SearchResponse[] = [];

        for (let i = 0; i < aniList.length; i++) {
            // Loop through every result
            const ani = aniList[i];
            const title = ani.title.userPreferred ?? ani.title.romaji ?? ani.title.english ?? ani.title.native;

            const promises = [];
            for (let i = 0; i < this.classDictionary.length; i++) {
                const provider:any = this.classDictionary[i];
                if (provider.object.providerType === type) {
                    promises.push(provider.object.search(title));
                }
            }
            const resultsArray = await Promise.all(promises);
            
            // Start looping through every provider
            for (let j = 0; j < resultsArray.length; j++) {
                // Loop through every provider result
                const providerResults = resultsArray[j];
                const providerTitles = providerResults.map((item:any) => this.sanitizeTitle(item.title.toLowerCase()) as string);
                if (providerTitles.length === 0) {
                    continue;
                }
                const titles = Object.values(ani.title);

                // Find the best result out of all the romaji, native, and english titles.
                const temp = [];
                for (let k = 0; k < titles.length; k++) {
                    const title = titles[k];
                    if (!title) {
                        continue;
                    }
                    const match = findBestMatch(title.toLowerCase(), providerTitles)
                    const result = providerResults[match.bestMatchIndex];
                    temp.push({ result: result, similarity: match.bestMatch.rating });
                }
                let best = 0;
                let bestIndex = 0;
                for (let k = 0; k < temp.length; k++) {
                    if (temp[k].similarity > best) {
                        best = temp[k].similarity;
                        bestIndex = k;
                    }
                }
                results.push({
                    id: temp[bestIndex].result.url,
                    data: ani,
                    similarity: { same: best > 0.5, value: best },
                });
            }
        }
        return this.formatSearch(results);
    }

    /**
     * @description Gets results from MALSync
     * @param query Media to search for.
     * @param type Type of media to search for.
     * @returns Promise<FormattedResponse[]>
     */
    private async malSync(query:string, type:Type): Promise<FormattedResponse[]> {
        const aniList = await this.aniList.search(query, type);

        const results:FormattedResponse[] = [];

        for (let i = 0; i < aniList.length; i++) {
            const ani = aniList[i];
            const response = await this.fetch(`https://api.malsync.moe/mal/${type.toLowerCase()}/${ani.idMal}`).catch((err) => {
                return null;
            });
            if (!response) {
                continue;
            }
            const data = response.json();
            if (data.code === 404) {
                throw new Error("Not found.");
            }
    
            const malId = data.id;
            const malURL = data.url;
            const malImg = data.image;
    
            const aniDbID = data.anidbId;
    
            const sitesT = data.Sites as {
                [k: string]: { [k: string]: { url: string; connector: string; title: string } };
            };
    
            let sites = Object.values(sitesT).map((v, i) => {
                const obj = [...Object.values(Object.values(sitesT)[i])];
                const pages = obj.map(v => ({ connector: v.connector, url: v.url, title: v.title }));
                return pages;
            }) as any[];
    
            sites = sites.flat();
    
            const connectors = [];
            for (let i = 0; i < sites.length; i++) {
                connectors.push({
                    id: sites[i].url,
                    similarity: { same: true, value: 1 }
                })
            }

            results.push({
                id: String(ani.id),
                data: ani,
                connectors: connectors
            })
            await this.wait(1000); // MALSync timeout
        }
        return results;
    }

    /**
     * @description Searches for media on AniList and maps the results to providers.
     * @param query Media to search for.
     * @param type Type of media to search for.
     * @returns Promise<FormattedResponse[]>
     */
    private async aniSearch(query:string, type:Type): Promise<FormattedResponse[]> {
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
    private async pageSearch(query:string, type:Type): Promise<FormattedResponse[]> {
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
                if (Number(results[i].id) === Number(id)) {
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
     * @description Gets the TMDB info of a media
     * @param id AniList ID
     * @returns Promise<TMDBResponse>
     */
    public async getTMDB(id:string) {
        const info = await this.get(id);
        if (!info) {
            return null;
        }
        let data = null;

        const connectors = info.connectors;
        for (let i = 0; i < connectors.length; i++) {
            const id = connectors[i].id;
            const provider = this.fetchProvider(id);
            if (provider.provider_name === "TMDB") {
                data = await provider.provider.getInfo(id.split(provider.provider.baseURL)[1]).catch((err) => {
                    return { error: err.message };
                });
            }
        }
        return data;
    }

    public async getThemes(id:string) {
        const info = await this.get(id);
        if (!info) {
            return null;
        }
        let data = null;

        const connectors = info.connectors;
        for (let i = 0; i < connectors.length; i++) {
            const id = connectors[i].id;
            const provider = this.fetchProvider(id);
            if (provider.provider_name === "AnimeThemes") {
                data = await provider.provider.getThemes(id.split(provider.provider.baseURL)[1]).catch((err) => {
                    return { error: err.message };
                });

                if (data != null && data.error == null) {
                    data = data.map((theme) => {
                        return {
                            type: theme.type,
                            url: provider.provider.parseTheme(theme)
                        }
                    });
                }
            }
        }
        return data;
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
                    if (String(curVal[i].id) === String(newVal[j].id)) {
                        // Can compare now
                        const connectors = [];
                        for (let k = 0; k < curVal[i].connectors.length; k++) {
                            for (let l = 0; l < newVal[j].connectors.length; l++) {
                                if (curVal[i].connectors[k].id === newVal[j].connectors[l].id) {
                                    // Compare similarity
                                    if (newVal[j].connectors[l].similarity.value < threshold || curVal[i].connectors[k].similarity.value >= newVal[j].connectors[l].similarity.value) {
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
     * @description Compares two responses and replaces results that have a better response
     * @param curVal Original response
     * @param newVal New response to compare
     * @param threshold Optional minimum threshold required
     * @returns FormattedResponse[]
     */
    private searchCompareSoft(curVal:FormattedResponse[], newVal:FormattedResponse[], threshold = 0):FormattedResponse[] {
        const res = [];
        if (curVal.length > 0 && newVal.length > 0) {
            for (let i = 0; i < curVal.length; i++) {
                for (let j = 0; j < newVal.length; j++) {
                    if (String(curVal[i].id) === String(newVal[j].id)) {
                        // Can compare now
                        const connectors = [];
                        for (let k = 0; k < curVal[i].connectors.length; k++) {
                            for (let l = 0; l < newVal[j].connectors.length; l++) {
                                if (curVal[i].connectors[k].id === newVal[j].connectors[l].id || compareTwoStrings(curVal[i].connectors[k].id, newVal[j].connectors[l].id) > 0.5) {
                                    // Compare similarity
                                    if (newVal[j].connectors[l].similarity.value < threshold || curVal[i].connectors[k].similarity.value >= newVal[j].connectors[l].similarity.value) {
                                        connectors.push(curVal[i].connectors[k]);
                                    } else {
                                        connectors.push(newVal[j].connectors[l]);
                                    }
                                } else {
                                    connectors.push(curVal[i].connectors[k]);
                                    connectors.push(newVal[j].connectors[l]);
                                }
                            }
                        }

                        const newConnectors = [];
                        // Only include the best connectors
                        for (let l = 0; l < connectors.length; l++) {
                            let best = -1;
                            let bestSimilarity = 0;
                            const connector = connectors[l];

                            for (let m = 0; m < connectors.length; m++) {
                                const possible = connectors[m];
                                // If the two connectors are similar/the same
                                if (connector.id === possible.id || compareTwoStrings(connector.id, possible.id) > 0.7) {
                                    if (possible.similarity.value > bestSimilarity) {
                                        best = m;
                                        bestSimilarity = possible.similarity.value;
                                    }
                                }
                            }

                            const possible = best > -1 ? connectors[best] : connector;
                            let canPush = true;
                            for (let m = 0; m < newConnectors.length; m++) {
                                if (newConnectors[m].id === possible.id || compareTwoStrings(newConnectors[m].id, possible.id) > 0.7) {
                                    canPush = false;
                                }
                            }
                            if (canPush) {
                                newConnectors.push(possible);
                            }
                        }

                        res.push({
                            id: curVal[i].id,
                            data: curVal[i].data,
                            connectors: newConnectors,
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
    public async export(): Promise<void> {
        await this.db.export();
    }

    /**
     * @description Imports a JSON file into the database.
     * @param type Type of media to export
     */
        public async import(): Promise<void> {
        await this.db.import();
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

interface Options {
    debug?: boolean,
    cache_timeout?: number,
    encryptionKey?: string,
    storage?: string,
    isMacOS?: boolean,
    poppler_path?: string,
    web_server?: {
        url?: string,
        main_url?: string,
        cors?: [string],
        port?: number
    },
    AniList?: {
        SEASON?: string,
        SEASON_YEAR?: number,
        NEXT_SEASON?: string,
        NEXT_YEAR?: number,
        oath_id?: number,
        oath_secret?: string
    },
    database_url?: string,
    is_sqlite?: boolean
}

export type { Result, Provider, FormattedResponse, SearchResponse, Content, Options };