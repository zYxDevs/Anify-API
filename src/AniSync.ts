import API, { ProviderType } from "./API";
import StringSimilarity from "./libraries/StringSimilarity";
import { config } from "./config";
import AniList, { Format, Genres, Media, Type, UserResponse } from "./providers/meta/AniList";
import { Episode, SearchResponse, SubbedSource } from "./providers/anime/Anime";
import TMDB from "./providers/meta/TMDB";
import ComicK from "./providers/manga/ComicK";
import MangaDex from "./providers/manga/MangaDex";
import Mangakakalot from "./providers/manga/Mangakakalot";
import GogoAnime from "./providers/anime/GogoAnime";
import AnimeFox from "./providers/anime/AnimeFox";
import AnimePahe from "./providers/anime/AnimePahe";
import Enime from "./providers/anime/Enime";
import Zoro from "./providers/anime/Zoro";
import CrunchyRoll from "./providers/anime/CrunchyRoll";
import { Chapter, Page } from "./providers/manga/Manga";
import Kitsu from "./providers/meta/Kitsu";
import * as colors from "colors";

export default class AniSync extends API {
    private stringSim:StringSimilarity = new StringSimilarity();
    private crunchyroll:CrunchyRoll;
    public classDictionary:Provider[] = [];

    constructor() {
        super(ProviderType.NONE);

        this.crunchyroll = new CrunchyRoll();

        const tmdb = new TMDB();
        const comicK = new ComicK();
        const mangadex = new MangaDex();
        const mangakakalot = new Mangakakalot();
        const gogoAnime = new GogoAnime();
        const animeFox = new AnimeFox();
        const animePahe = new AnimePahe();
        const enime = new Enime();
        const zoro = new Zoro();

        // Loop through config to set class dictionary
        this.classDictionary = [
            {
                name: tmdb.providerName,
                object: tmdb
            },
            {
                name: comicK.providerName,
                object: comicK
            },
            {
                name: mangadex.providerName,
                object: mangadex
            },
            {
                name: mangakakalot.providerName,
                object: mangakakalot
            },
            {
                name: gogoAnime.providerName,
                object: gogoAnime
            },
            {
                name: animeFox.providerName,
                object: animeFox
            },
            {
                name: animePahe.providerName,
                object: animePahe
            },
            {
                name: enime.providerName,
                object: enime
            },
            {
                name: zoro.providerName,
                object: zoro
            },
            {
                name: this.crunchyroll.providerName,
                object: this.crunchyroll
            }
        ];
    }

    // You want to search the database first, but since that hasn't been setup yet, we'll just search the providers.
    public async search(query:string, type:Type["ANIME"]|Type["MANGA"]): Promise<Result[]> {
        const promises = [];

        if (type === "ANIME") {
            const aniData:Media[] = [null];

            // Most likely will have to change TV to MOVIE, OVA, etc.
            const aniList = new AniList("", type, Format.TV);
            
            const aniListPromise = new Promise((resolve, reject) => {
                aniList.search(query).then((result) => {
                    const data = result.data.Page.media;
                    aniData.push(...data);
                    resolve(aniData);
                });
            });
            promises.push(aniListPromise);
            await Promise.all(promises);

            // Search AniList first, then search the other providers.
            const possibleData = await this.searchAnimeData(aniData);
            if (possibleData.length > 0) {
                return possibleData;
            }
            
            const aggregatorData:AggregatorData[] = await this.fetchData(query, type).catch((err) => {
                console.error(err);
                return [];
            });
            const comparison:Search[] = [];
            aggregatorData.map((result, index) => {
                const provider = result.provider_name;
                const results = result.results;

                for (let i = 0; i < results.length; i++) {
                    const data = this.compareAnime(results[i], aniData, config.mapping.provider[provider]?.threshold, config.mapping.provider[provider]?.comparison_threshold);
                    if (data != undefined) {
                        comparison.push({
                            provider,
                            data
                        });
                    }
                }
            });

            const result = this.formatData(comparison);
            return result;
        } else if (type === "MANGA") {
            const aniData:Media[] = [null];

            // Most likely will have to change MANGA to ONE_SHOT as well.
            const aniList = new AniList("", type, Format.MANGA);
            
            const aniListPromise = new Promise((resolve, reject) => {
                aniList.search(query).then((result) => {
                    const data = result.data.Page.media;
                    aniData.push(...data);
                    resolve(aniData);
                });
            });
            promises.push(aniListPromise);
            await Promise.all(promises);

            // Search AniList first, then search the other providers.
            const possibleData = await this.searchMangaData(aniData);
            if (possibleData.length > 0) {
                return possibleData;
            }
            
            const aggregatorData:AggregatorData[] = await this.fetchData(query, type).catch((err) => {
                console.error(err);
                return [];
            });
            const comparison:Search[] = [];
            aggregatorData.map((result, index) => {
                const provider = result.provider_name;
                const results = result.results;

                for (let i = 0; i < results.length; i++) {
                    const data = this.compareAnime(results[i], aniData, config.mapping.provider[provider]?.threshold, config.mapping.provider[provider]?.comparison_threshold);
                    if (data != undefined) {
                        comparison.push({
                            provider,
                            data
                        });
                    }
                }
            });

            const result = this.formatData(comparison);
            return result;
        } else {
            throw new Error("Invalid type. Valid types include ANIME and MANGA.");
        }
    }

    // Same as the search function, but rather searches for genres specifically.
    public async searchGenres(type:Type["ANIME"]|Type["MANGA"], includedGenres?:Genres[], excludedGenres?:Genres[]): Promise<Result[]> {
        const promises = [];

        if (type === "ANIME") {
            const aniData:Media[] = [null];

            // Most likely will have to change TV to MOVIE, OVA, etc.
            const aniList = new AniList("", type, Format.TV);
            const anime = new Zoro();
            
            const aniListPromise = new Promise((resolve, reject) => {
                aniList.searchGenres(includedGenres, excludedGenres).then((result) => {
                    const data = result.data.Page.media;
                    aniData.push(...data);
                    resolve(aniData);
                });
            });
            promises.push(aniListPromise);
            await Promise.all(promises);

            // Search AniList first, then search the other providers.
            const possibleData = await this.searchAnimeData(aniData);
            if (possibleData.length > 0) {
                return possibleData;
            }
            
            const result:Result[] = await this.fetchCrawlData(aniData, type).catch((err) => {
                console.error(err);
                return [];
            });

            await anime.insert(result);

            return result;
        } else if (type === "MANGA") {
            const aniData:Media[] = [null];

            // Most likely will have to change MANGA to ONE_SHOT as well.
            const aniList = new AniList("", type, Format.MANGA);
            const manga = new ComicK();
            
            const aniListPromise = new Promise((resolve, reject) => {
                aniList.searchGenres(includedGenres, excludedGenres).then((result) => {
                    const data = result.data.Page.media;
                    aniData.push(...data);
                    resolve(aniData);
                });
            });
            promises.push(aniListPromise);
            await Promise.all(promises);

            // Search AniList first, then search the other providers.
            const possibleData = await this.searchMangaData(aniData);
            if (possibleData.length > 0) {
                return possibleData;
            }
            
            const result:Result[] = await this.fetchCrawlData(aniData, type).catch((err) => {
                console.error(err);
                return [];
            });

            await manga.insert(result);

            return result;
        } else {
            throw new Error("Invalid type. Valid types include ANIME and MANGA.");
        }
    }

    public async crawl(type:Type["ANIME"]|Type["MANGA"], start?:number, maxPages?:number, wait?:number, idsPerPage?:number) {
        maxPages = maxPages ? maxPages : config.crawling.data.max_pages;
        wait = wait ? wait : config.crawling.data.wait;
        start = start ? start : config.crawling.data.start;
        idsPerPage = idsPerPage ? idsPerPage : config.crawling.data.ids_per_page;

        if (type === "ANIME") {
            let canCrawl = true;
            const anime = new Zoro();

            const ids = await this.getAnimeIDs();
            const pages = Math.ceil(ids.length / idsPerPage);
            if (pages < maxPages) {
                maxPages = pages;
            }

            for (let i = start; i < maxPages && canCrawl; i++) {
                const debugTimer = new Date(Date.now());
                if (config.crawling.debug) {
                    console.log(colors.gray("Crawling page ") + i + colors.gray("..."));
                }

                const aniListMedia = [];

                for (let j = 0; j < idsPerPage; j++) {
                    const id = ids[i * idsPerPage + j];
                    if (id) {
                        const aniList = new AniList(id, type, Format.TV, false);
                        const aniListData = await aniList.getInfo().catch((err) => {
                            return null;
                        });
                        if (!aniListData) {
                            console.log(colors.red("Can't get " + id + "."));
                        } else {
                            const data = aniListData.data.Media;
                            if (!data) {
                                console.log(colors.red("No more data to crawl."));
                                canCrawl = false;
                            }
                            aniListMedia.push(data);
                        }
                    }
                    await this.wait(config.mapping.provider.AniList.wait)
                }

                if (!aniListMedia || aniListMedia.length === 0) {
                    console.log(colors.red("No more data to crawl."));
                    canCrawl = false;
                }
                
                if (config.crawling.debug) {
                    console.log(colors.gray("Fetched seasonal data..."));
                }

                const data:Result[] = await this.fetchCrawlData(aniListMedia, type);

                if (config.crawling.debug) {
                    const endTimer = new Date(Date.now());
                    console.log(colors.white("Finished fetching data. Request took ") + colors.cyan(String(endTimer.getTime() - debugTimer.getTime())) + colors.white(" milliseconds."));
                }

                await anime.insert(data);

                if (config.crawling.debug) {
                    console.log(colors.gray("Finished inserting shows."));
                }

                await this.wait(wait);
            }
            console.log(colors.cyan("Finished crawling!"));
        } else {
            const manga = new ComicK();
            let canCrawl = true;

            const ids = await this.getMangaIDs();
            const pages = Math.ceil(ids.length / idsPerPage);
            if (pages < maxPages) {
                maxPages = pages;
            }

            for (let i = start; i < maxPages && canCrawl; i++) {
                const debugTimer = new Date(Date.now());
                if (config.crawling.debug) {
                    console.log(colors.gray("Crawling page ") + i + colors.gray("..."));
                }

                const aniListMedia = [];

                for (let j = 0; j < idsPerPage; j++) {
                    const id = ids[i * idsPerPage + j];
                    if (id) {
                        const aniList = new AniList(id, type, Format.MANGA, false);
                        const aniListData = await aniList.getInfo().catch((err) => {
                            return null;
                        });
                        if (!aniListData) {
                            console.log(colors.red("Can't get " + id + "."));
                        } else {
                            const data = aniListData.data.Media;
                            if (!data) {
                                console.log(colors.red("No more data to crawl."));
                                canCrawl = false;
                            }
                            aniListMedia.push(data);
                        }
                    }
                    await this.wait(config.mapping.provider.AniList.wait)
                }

                if (!aniListMedia || aniListMedia.length === 0) {
                    console.log(colors.red("No more data to crawl."));
                    canCrawl = false;
                }
            
                if (config.crawling.debug) {
                    console.log(colors.gray("Fetched seasonal data..."));
                }

                const data:Result[] = await this.fetchCrawlData(aniListMedia, type);

                if (config.crawling.debug) {
                    const endTimer = new Date(Date.now());
                    console.log(colors.white("Finished fetching data. Request took ") + colors.cyan(String(endTimer.getTime() - debugTimer.getTime())) + colors.white(" milliseconds."));
                }

                await manga.insert(data);

                if (config.crawling.debug) {
                    console.log(colors.gray("Finished inserting manga."));
                }

                await this.wait(wait);
            }
            console.log(colors.cyan("Finished crawling!"));
        }
    }

    private async getAnimeIDs(): Promise<string[]> {
        const req1 = await this.fetch("https://anilist.co/sitemap/anime-0.xml");
        const data1 = await req1.text();
        const req2 = await this.fetch("https://anilist.co/sitemap/anime-1.xml");
        const data2 = await req2.text();

        const ids1 = data1.match(/anime\/([0-9]+)/g).map((id) => {
            return id.replace("anime/", "");
        });

        const ids2 = data2.match(/anime\/([0-9]+)/g).map((id) => {
            return id.replace("anime/", "");
        });
        return ids1.concat(ids2);
    }

    private async getMangaIDs(): Promise<string[]> {
        const req1 = await this.fetch("https://anilist.co/sitemap/manga-0.xml");
        const data1 = await req1.text();
        const req2 = await this.fetch("https://anilist.co/sitemap/manga-1.xml");
        const data2 = await req2.text();

        const ids1 = data1.match(/manga\/([0-9]+)/g).map((id) => {
            return id.replace("manga/", "");
        });

        const ids2 = data2.match(/manga\/([0-9]+)/g).map((id) => {
            return id.replace("manga/", "");
        });
        return ids1.concat(ids2);
    }

    public async getTrending(type:Type["ANIME"]|Type["MANGA"]):Promise<Result[]> {
        if (type === "ANIME") {
            // Most likely will have to change TV to MOVIE, OVA, etc.
            const aniList = new AniList("", type, Format.TV);
            
            const data = await aniList.getSeasonal();
            const trending:Media[] = data.data.trending.media;

            const trendingData:Result[] = await this.getSeasonal(trending, type);
            return trendingData;
        } else {
            // Most likely will have to change TV to MOVIE, OVA, etc.
            const aniList = new AniList("", type, Format.MANGA);
            
            const data = await aniList.getSeasonal(null, null, "MANGA");
            const trending:Media[] = data.data.trending.media;

            const trendingData:Result[] = await this.getSeasonal(trending, type);
            return trendingData;
        }
    }

    public async getSeason(type:Type["ANIME"]|Type["MANGA"]):Promise<Result[]> {
        if (type === "ANIME") {
            // Most likely will have to change TV to MOVIE, OVA, etc.
            const aniList = new AniList("", type, Format.TV);
            
            const data = await aniList.getSeasonal();
            const season:Media[] = data.data.season.media;

            const seasonData:Result[] = await this.getSeasonal(season, type);
            return seasonData;
        } else {
            // Most likely will have to change TV to MOVIE, OVA, etc.
            const aniList = new AniList("", type, Format.MANGA);
            
            const data = await aniList.getSeasonal();
            const season:Media[] = data.data.season.media;

            const seasonData:Result[] = await this.getSeasonal(season, type);
            return seasonData;
        }
    }

    public async getPopular(type:Type["ANIME"]|Type["MANGA"]):Promise<Result[]> {
        if (type === "ANIME") {
            // Most likely will have to change TV to MOVIE, OVA, etc.
            const aniList = new AniList("", type, Format.TV);
            
            const data = await aniList.getSeasonal();
            const popular:Media[] = data.data.popular.media;

            const popularData:Result[] = await this.getSeasonal(popular, type);
            return popularData;
        } else {
            // Most likely will have to change TV to MOVIE, OVA, etc.
            const aniList = new AniList("", type, Format.MANGA);
            
            const data = await aniList.getSeasonal();
            const popular:Media[] = data.data.popular.media;

            const popularData:Result[] = await this.getSeasonal(popular, type);
            return popularData;
        }
    }

    public async getTop(type:Type["ANIME"]|Type["MANGA"]):Promise<Result[]> {
        if (type === "ANIME") {
            // Most likely will have to change TV to MOVIE, OVA, etc.
            const aniList = new AniList("", type, Format.TV);
            
            const data = await aniList.getSeasonal();
            const top:Media[] = data.data.top.media;

            const topData:Result[] = await this.getSeasonal(top, type);
            return topData;
        } else {
            // Most likely will have to change TV to MOVIE, OVA, etc.
            const aniList = new AniList("", type, Format.MANGA);
            
            const data = await aniList.getSeasonal();
            const top:Media[] = data.data.top.media;

            const topData:Result[] = await this.getSeasonal(top, type);
            return topData;
        }
    }

    public async getNextSeason(type:Type["ANIME"]|Type["MANGA"]):Promise<Result[]> {
        // WILL MOST LIKELY HAVE NO RESULTS
        if (type === "ANIME") {
            // Most likely will have to change TV to MOVIE, OVA, etc.
            const aniList = new AniList("", type, Format.TV);
            
            const data = await aniList.getSeasonal();
            const nextSeason:Media[] = data.data.nextSeason.media;

            const nextData:Result[] = await this.getSeasonal(nextSeason, type);
            return nextData;
        } else {
            // Most likely will have to change TV to MOVIE, OVA, etc.
            const aniList = new AniList("", type, Format.MANGA);
            
            const data = await aniList.getSeasonal();
            const nextSeason:Media[] = data.data.nextSeason.media;

            const nextData:Result[] = await this.getSeasonal(nextSeason, type);
            return nextData;
        }
    }

    public async get(id:string): Promise<Result> {
        const anime = new Zoro();
        const manga = new ComicK();

        let possible:Result = await anime.get(id);
        if (!possible) {
            possible = await manga.get(id);
        }
        return possible;
    }

    public async getList(userId:number, type:Type["ANIME"]|Type["MANGA"]) {
        const aniList = new AniList();
        const data = await aniList.getList(userId, type);

        const result = [];
        
        for (let i = 0; i < data.data.MediaListCollection.lists.length; i++) {
            const list = data.data.MediaListCollection.lists[i];
            const toPush = {
                name: list.name,
                media: []
            }

            for (let j = 0; j < list.entries.length; j++) {
                const media = list.entries[j].media;
                const possible = await this.get(media.id.toString());
                if (possible) {
                    toPush.media.push(possible);
                }
            }
            result.push(toPush);
        }
        return result;
    }

    public async getUserInfo(username:string):Promise<UserResponse> {
        const aniList = new AniList();
        const user = await aniList.getUser(username);
        return user;
    }

    public async getEpisodes(id:string): Promise<ProviderEpisodes[]> {
        const show = await this.get(id);
        if (show.anilist.type === "MANGA") {
            return [];
        }
        const episodes = [];
        const connectors = show.connectors;

        const anime = new Zoro();
        const possible = await anime.getCachedEpisodes(id);
        if (possible != null) {
            const curTime = new Date(Date.now()).getTime();
            const diff = curTime - possible.lastCached;
            if (diff < config.anime.cache_timeout && possible.data.length > 0) {
                episodes.push(...possible.data);
                return episodes;
            }
        }

        const promises = [];

        for (let i = 0; i < connectors.length; i++) {
            const provider = connectors[i];
            const promise = new Promise(async(resolve, reject) => {
                const object = this.fetchProvider(provider.provider);
                if (object != null && object.providerType === ProviderType.ANIME) {
                    const fetched = await object.getEpisodes(provider.data.id).catch((err) => {
                        return null;
                    });
                    if (fetched != null) {
                        episodes.push({
                            provider: provider.provider,
                            provider_data: provider.data,
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
        anime.cacheEpisodes(id, episodes);
        return episodes;
    }

    public async getSources(id:string, providerName:string, watchId:string) {
        const provider = this.fetchProvider(providerName);
        if (!provider) {
            return null;
        }

        let sources:SubbedSource = null;
        const anime = new Zoro();
        const possible = await anime.getCachedSources(id, watchId);
        if (possible != null) {
            const curTime = new Date(Date.now()).getTime();
            const diff = curTime - possible.lastCached;
            if (possible.data != null) {
                if (provider.providerName === anime.providerName) {
                    // Check if the provider is Zoro. If it is, then you can ignore the cache timeout.
                    sources = possible.data;
                    return sources;
                } else {
                    if (diff < config.anime.cache_timeout) {
                        sources = possible.data;
                        return sources;
                    }
                }
            }
        }
        const data = await provider.getSources(watchId);
        sources = data;
        if (sources.sources.length > 0) {
            anime.cacheSources(id, watchId, sources);
        }
        return sources;
    }

    public async getChapters(id:string): Promise<ProviderChapters[]> {
        const show = await this.get(id);
        if (!show || show.anilist.type === "ANIME") {
            return [];
        }
        const chapters = [];
        const connectors = show.connectors;

        const manga = new ComicK();
        const possible = await manga.getCachedChapters(id);
        if (possible != null) {
            const curTime = new Date(Date.now()).getTime();
            const diff = curTime - possible.lastCached;
            if (diff < config.manga.cache_timeout && possible.data.length > 0) {
                chapters.push(...possible.data);
                return chapters;
            }
        }

        const promises = [];

        for (let i = 0; i < connectors.length; i++) {
            const provider = connectors[i];
            const promise = new Promise(async(resolve, reject) => {
                const object = this.fetchProvider(provider.provider);
                if (object != null && object.providerType === ProviderType.MANGA) {
                    const fetched = await object.getChapters(provider.data.id).catch((err) => {
                        return null;
                    });
                    if (fetched != null) {
                        chapters.push({
                            provider: provider.provider,
                            provider_data: provider.data,
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
        manga.cacheChapters(id, chapters);
        return chapters;
    }

    public async getPages(id:string, providerName:string, readId:string): Promise<Page[]> {
        const provider = this.fetchProvider(providerName);
        if (!provider) {
            return null;
        }

        let sources:Page[] = null;
        const manga = new ComicK();
        const possible = await manga.getCachedPages(id, readId);
        if (possible != null) {
            const curTime = new Date(Date.now()).getTime();
            const diff = curTime - possible.lastCached;
            if (diff < config.manga.cache_timeout && possible.data != null) {
                sources = possible.data;
                return sources;
            }
        }
        const data = await provider.getPages(readId);
        sources = data;
        manga.cachePages(id, readId, sources);
        return sources;
    }

    public async getRelations(id:string) {
        const anime = new Zoro();
        const manga = new ComicK();
        const info = await this.get(id);
        if (!info) {
            return null;
        }
        const results = [];

        const relations = info.anilist.relations;
        for (let i = 0; i < relations.edges.length; i++) {
            const relation = relations.edges[i];
            if (relation.node.type === "ANIME") {
                const possible = await anime.get(String(relation.node.id));
                if (possible != undefined) {
                    results.push({
                        data: possible,
                        type: "ANIME",
                        relationType: relation.relationType,
                    })
                }
            } else if (relation.node.type === "MANGA") {
                const possible = await manga.get(String(relation.node.id));
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

    private fetchProvider(providerName:string):any {
        let provider = null;
        this.classDictionary.map((el, index) => {
            if (el.name.toLowerCase() === providerName.toLowerCase()) {
                provider = el.object;
            }
        })
        return provider;
    }

    private async fetchCrawlData(season:Media[], type:Type["ANIME"]|Type["MANGA"]):Promise<Result[]> {
        if (type === "ANIME") {
            const seasonData:Search[] = [];
            const allSeason:Result[] = [];

            const promises = [];
            for (let i = 0; i < season.length; i++) {
                const promise = new Promise(async(resolve, reject) => {
                    const aniData = season[i];
                    if (!aniData) {
                        resolve(false);
                        return;
                    }

                    const possible = await this.getShow(String(aniData.id));
                    if (!possible) {
                        const title = aniData.title.english ? aniData.title.english : aniData.title.romaji;
    
                        const aggregatorData:AggregatorData[] = await this.fetchData(title, type).catch((err) => {
                            console.error(err);
                            return [];
                        });
        
                        aggregatorData.map((result, index) => {
                            const provider = result.provider_name;
                            const results = result.results;
        
                            for (let i = 0; i < results.length; i++) {
                                const data = this.compareAnime(results[i], [aniData], config.mapping.provider[provider]?.threshold, config.mapping.provider[provider]?.comparison_threshold);
                                if (data != undefined) {
                                    seasonData.push({
                                        provider,
                                        data
                                    });
                                }
                            }
                        });
                        resolve(true);
                    } else {
                        allSeason.push(possible);
                        resolve(true);
                    }
                })
                promises.push(promise);
            }
            await Promise.all(promises);
            const formatted = this.formatData(seasonData);
            allSeason.push(...formatted);
            return allSeason;
        } else {
            const seasonData:Search[] = [];
            const allSeason:Result[] = [];

            const promises = [];
            for (let i = 0; i < season.length; i++) {
                const promise = new Promise(async(resolve, reject) => {
                    const aniData = season[i];
                    if (!aniData) {
                        resolve(false);
                        return;
                    }

                    const possible = await this.getManga(String(aniData.id));
                    if (!possible) {
                        const title = aniData.title.english;
    
                        const aggregatorData:AggregatorData[] = await this.fetchData(title, type).catch((err) => {
                            console.error(err);
                            return [];
                        });
        
                        aggregatorData.map((result, index) => {
                            const provider = result.provider_name;
                            const results = result.results;
        
                            for (let i = 0; i < results.length; i++) {
                                const data = this.compareAnime(results[i], [aniData], config.mapping.provider[provider]?.threshold, config.mapping.provider[provider]?.comparison_threshold);
                                if (data != undefined) {
                                    seasonData.push({
                                        provider,
                                        data
                                    });
                                }
                            }
                        });
                        resolve(true);
                    } else {
                        allSeason.push(possible);
                        resolve(true);
                    }
                })
                promises.push(promise);
            }
            await Promise.all(promises);
            const formatted = this.formatData(seasonData);
            allSeason.push(...formatted);
            return allSeason;
        }
    }

    private async getSeasonal(season:Media[], type:Type["ANIME"]|Type["MANGA"]):Promise<Result[]> {
        if (type === "ANIME") {
            const seasonData:Search[] = [];
            const allSeason:Result[] = [];

            const possibleTrending = await this.searchAnimeData(season);
            if (possibleTrending.length > 0) {
                allSeason.push(...possibleTrending);
            } else {
                for (let i = 0; i < season.length; i++) {
                    const aniData = season[i];
                    const title = aniData.title.english;
    
                    const aggregatorData:AggregatorData[] = await this.fetchData(title, type).catch((err) => {
                        console.error(err);
                        return [];
                    });
    
                    aggregatorData.map((result, index) => {
                        const provider = result.provider_name;
                        const results = result.results;
    
                        for (let i = 0; i < results.length; i++) {
                            const data = this.compareAnime(results[i], [aniData], config.mapping.provider[provider]?.threshold, config.mapping.provider[provider]?.comparison_threshold);
                            if (data != undefined) {
                                seasonData.push({
                                    provider,
                                    data
                                });
                            }
                        }
                    });
                }
                const formatted = this.formatData(seasonData);
                allSeason.push(...formatted);
            }
            return allSeason;
        } else {
            const seasonData:Search[] = [];
            const allSeason:Result[] = [];

            const possibleTrending = await this.searchMangaData(season);
            if (possibleTrending.length > 0) {
                allSeason.push(...possibleTrending);
            } else {
                for (let i = 0; i < season.length; i++) {
                    const aniData = season[i];
                    const title = aniData.title.english;
    
                    const aggregatorData:AggregatorData[] = await this.fetchData(title, type).catch((err) => {
                        console.error(err);
                        return [];
                    });
    
                    aggregatorData.map((result, index) => {
                        const provider = result.provider_name;
                        const results = result.results;
    
                        for (let i = 0; i < results.length; i++) {
                            const data = this.compareAnime(results[i], [aniData], config.mapping.provider[provider]?.threshold, config.mapping.provider[provider]?.comparison_threshold);
                            if (data != undefined) {
                                seasonData.push({
                                    provider,
                                    data
                                });
                            }
                        }
                    });
                }
                const formatted = this.formatData(seasonData);
                allSeason.push(...formatted);
            }
            return allSeason;
        }
    }

    private async fetchData(query:string, type:Type["ANIME"]|Type["MANGA"]):Promise<AggregatorData[]> {
        const promises = [];
        const aggregatorData:AggregatorData[] = [];

        const kitsu = new Kitsu();

        for (let i = 0; i < this.classDictionary.length; i++) {
            const provider = this.classDictionary[i].object;
            const name = this.classDictionary[i].name;

            const promise = new Promise((resolve, reject) => {
                if (!config.mapping.provider[name].disabled) {
                    if (name === kitsu.providerName) {
                        this.wait(config.mapping.provider.Kitsu.wait).then(async() => {
                            if (type === "ANIME") {
                                const results = await kitsu.searchAnime(query);
                                aggregatorData.push({
                                    provider_name: name,
                                    results
                                });
                                resolve(aggregatorData);
                            } else {
                                const results = await kitsu.searchManga(query);
                                aggregatorData.push({
                                    provider_name: name,
                                    results
                                });
                                resolve(aggregatorData);
                            }
                        })
                    } else {
                        if (type === provider.providerType) {
                            this.wait(config.mapping.provider[name] ? config.mapping.provider[name].wait : config.mapping.wait).then(async() => {
                                if (name === this.crunchyroll.providerName) {
                                    if (!this.crunchyroll.hasInit) {
                                        await this.crunchyroll.init();
                                    }
                                }
    
                                const parsedQuery = this.getPartialQuery(query, config.mapping.provider[name].search_partial ? config.mapping.provider[name].partial_amount : 1);
                                
                                provider.search(parsedQuery).then((results) => {
                                    aggregatorData.push({
                                        provider_name: name,
                                        results: results
                                    });
                                    resolve(aggregatorData);
                                }).catch((err) => {
                                    reject(err);
                                });
                            });   
                        } else {
                            resolve(true);
                        }
                    }
                } else {
                    resolve(true);
                }
            })
            promises.push(promise);
        }
        await Promise.all(promises);
        return aggregatorData;
    }

    private getPartialQuery(query:string, partialAmount:number):string {
        query = query ? query : "";
        if (partialAmount === 1) return query;
        const split:string[] = query.split(" ");
        const splitLength = split.length;
        const maxIndex:number = Math.round(splitLength * partialAmount);
        let newQuery = "";
        for (let j = 0; j < maxIndex; j++) {
            const word = query.split(" ")[j];
            newQuery += newQuery.length === 0 ? word : " " + word;
        }
        return newQuery;
    }

    // Formats search results into singular AniList data. Assigns each provider to an AniList object.
    private formatData(results:Search[]):Result[] {
        const aniList = [];

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const provider = result.provider;
            const data = result.data;

            let media:any = data.media;
            let canPush = true;
            let index = -1;

            for (let j = 0; j < aniList.length; j++) {
                if (aniList[j].id === media.id) {
                    canPush = false;
                    media = aniList[j];
                    index = j;
                }
            }
            if (canPush) {
                aniList.push({
                    id: media.id,
                    anilist: media,
                    connectors: [{ provider: provider, data: result.data.result, comparison: result.data.comparison }]
                });
            } else {
                const aniListData = media.anilist;
                const formatted = {
                    id: media.id,
                    anilist: aniListData,
                    connectors: [...aniList[index].connectors, { provider: provider, data: result.data.result, comparison: result.data.comparison }]
                }
                aniList[index] = formatted;
            }
        }

        return aniList;
    }

    private checkItem(result1:Mapping, result2:Mapping, threshold:number):number {
        let amount = 0;
        let tries = 0;

        result1.title = result1.title != undefined ? result1.title.toLowerCase() : undefined;
        result1.romaji = result1.romaji != undefined ? result1.romaji.toLowerCase() : undefined;
        result1.native = result1.native != undefined ? result1.native.toLowerCase() : undefined;

        result2.title = result2.title != undefined ? result2.title.toLowerCase() : undefined;
        result2.romaji = result2.romaji != undefined ? result2.romaji.toLowerCase() : undefined;
        result2.native = result2.native != undefined ? result2.native.toLowerCase() : undefined;

        result1.format = result1.format != undefined ? result1.format.toLowerCase() : undefined;
        result2.format = result2.format != undefined ? result2.format.toLowerCase() : undefined;

        result1.year = result1.year != undefined && result1.year != "null" ? result1.year.toLowerCase() : undefined;
        result2.year = result2.year != undefined && result2.year != "null" ? result2.year.toLowerCase() : undefined;

        // Check title
        if (result1.title != undefined && result2.title != undefined) {
            tries++;
            const stringComparison = this.stringSim.compareTwoStrings(result1.title, result2.title);
            if (result1.title === result2.title || stringComparison > threshold) {
                amount++;
            }
        }

        if (result1.romaji != undefined && result2.romaji != undefined) {
            tries++;
            const stringComparison = this.stringSim.compareTwoStrings(result1.romaji, result2.romaji);
            if (result1.romaji === result2.romaji || stringComparison > threshold) {
                amount++;
            }
        }

        if (result1.native != undefined && result2.native != undefined) {
            tries++;
            const stringComparison = this.stringSim.compareTwoStrings(result1.native, result2.native);
            if (result1.native === result2.native || stringComparison > threshold) {
                amount++;
            }
        }

        if (result1.year != undefined && result2.year != undefined) {
            tries++;
            const stringComparison = this.stringSim.compareTwoStrings(result1.year, result2.year);
            if (result1.year === result2.year || stringComparison > threshold) {
                amount++;
            }
        }

        if (result1.format != undefined && result2.format != undefined) {
            tries++;
            const stringComparison = this.stringSim.compareTwoStrings(result1.format, result2.format);
            if (result1.format === result2.format || stringComparison > threshold) {
                amount++;
            }
        }
        return amount / tries;
    }

    private compareAnime(anime:SearchResponse, aniList:[Media]|Media[], threshold:number, comparison_threshold:number):ComparisonData {
        threshold = threshold ? threshold : config.mapping.threshold;
        comparison_threshold = comparison_threshold ? comparison_threshold : config.mapping.comparison_threshold;
        
        const result:ComparisonData[] = [];
        for (let i = 0; i < aniList.length; i++) {
            const media:Media = aniList[i];

            if (!media) {
                continue;
            }

            const map1:Mapping = {
                title: anime.title,
                romaji: anime.romaji,
                native: anime.native,
                year: anime.year,
                format: anime.format
            };
            const map2:Mapping = {
                title: media.title.english,
                romaji: media.title.romaji,
                native: media.title.native,
                year: String(media.seasonYear),
                format: media.format
            }

            const comparison = this.checkItem(map1, map2, threshold);
            if (comparison > comparison_threshold) {
                result.push({
                    result: anime,
                    media,
                    comparison
                })
            }
        }
        // It is possible that there are multiple results, so we need to sort them. But generally, there should only be one result.
        return result[0];
    }

    private async getShow(id:string):Promise<Result> {
        const anime = new Zoro();
        const data = await anime.get(id);
        return data;
    }

    private async getManga(id:string):Promise<Result> {
        const manga = new ComicK();
        const data = await manga.get(id);
        return data;
    }

    private async searchAnimeData(aniListData:Media[]):Promise<Result[]> {
        const promises = [];
        const results:Result[] = [];

        const anime = new Zoro();

        for (let i = 0; i < aniListData.length; i++) {
            const id = aniListData[i] ? aniListData[i].id : undefined;
            if (id != undefined) {
                const promise = new Promise(async(resolve, reject) => {
                    const data = await anime.get(String(id));
                    if (data != null) {
                        results.push(data);
                    }
                    resolve(true);
                })
                promises.push(promise);
            }
        }

        await Promise.all(promises);
        return results;
    }

    private async searchMangaData(aniListData:Media[]):Promise<Result[]> {
        const promises = [];
        const results:Result[] = [];

        const manga = new ComicK();

        for (let i = 0; i < aniListData.length; i++) {
            const id = aniListData[i] ? aniListData[i].id : undefined;
            if (id != undefined) {
                const promise = new Promise(async(resolve, reject) => {
                    const data = await manga.get(String(id));
                    if (data != null) {
                        results.push(data);
                    }
                    resolve(true);
                })
                promises.push(promise);
            }
        }

        await Promise.all(promises);
        return results;
    }

    public async getImage(url: string, options: {}): Promise<any> {
        const data = await this.fetch(url, {
            method: "GET",
            responseType: 'arraybuffer',
            ...options,
        });
        return data.raw().data;
    };
}

interface Search {
    provider: string;
    data: ComparisonData;
}

interface Result {
    id: number;
    anilist: Media;
    connectors: [
        {
            provider: string;
            data: SearchResponse;
            comparison: number;
        }
    ];
}

interface ComparisonData {
    result: SearchResponse;
    media: Media;
    comparison: number;
}

interface AggregatorData {
    provider_name: string;
    results: SearchResponse[]
}

interface Mapping {
    title?: string;
    romaji?: string;
    native?: string;
    year?:string;
    format?:string;
}

interface Provider {
    name: string;
    object: any;
}

interface ProviderEpisodes {
    provider: string;
    provider_data: SearchResponse;
    episodes: Episode[]
}

interface ProviderChapters {
    provider: string;
    provider_data: SearchResponse;
    chapters: Chapter[]
}

export type { Result, Provider, ProviderEpisodes, ProviderChapters };