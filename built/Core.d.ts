import API from "./API";
import AniList, { Type, Media } from "./meta/AniList";
import { Episode, Page, SubbedSource } from "./Provider";
export default class Core extends API {
    aniList: AniList;
    private db;
    classDictionary: Provider[];
    constructor(options?: Options);
    /**
     * @description Initializes the database
     */
    init(): Promise<void>;
    /**
     * @description Searches on AniList and on providers and finds the best results possible. Less accurate but a lot faster.
     * @param query Media to search for.
     * @param type Type of media to search for.
     * @returns Promise<FormattedResponse[]>
     */
    search(query: string, type: Type): Promise<FormattedResponse[]>;
    /**
     * @description Searches on AniList and on providers and finds the best results possible. Very accurate but a lot slower.
     * @param query Media to search for.
     * @param type Type of media to search for.
     * @returns Promise<FormattedResponse[]>
     */
    searchAccurate(query: string, type: Type): Promise<FormattedResponse[]>;
    testSearch(query: string, type: Type): Promise<FormattedResponse[]>;
    /**
     * @description Searches for media on AniList and maps the results to providers.
     * @param query Media to search for.
     * @param type Type of media to search for.
     * @returns Promise<FormattedResponse[]>
     */
    aniSearch(query: string, type: Type): Promise<FormattedResponse[]>;
    /**
     * @description Searches for media on all providers and maps the results to AniList.
     * @param query Media to search for.
     * @param type Type of media to search for.
     * @returns Promise<FormattedResponse[]>
     */
    pageSearch(query: string, type: Type): Promise<FormattedResponse[]>;
    /**
     *
     * @param id AniList ID of the media to get
     * @returns
     */
    get(id: string): Promise<FormattedResponse>;
    /**
     *
     * @param type Type of media to query
     * @param amount Amount of media to get
     * @param ommitTop Ommits data for top since there will sometimes be new shows that aren't in the database
     * @param ommitNextSeason Ommits data for next season (since there likely won't be any valid results)
     */
    getSeasonal(type: Type, amount: number, ommitTop?: boolean, ommitNextSeason?: boolean): Promise<SeasonalResponse>;
    /**
     * @description Fetches all episodes for a show and caches the data
     * @param id AniList ID
     * @returns Promise<Content[]>
     */
    getEpisodes(id: string): Promise<Content[]>;
    /**
     * @description Fetches all chapters for a manga and caches the data
     * @param id AniList ID
     * @returns Promise<Content[]>
     */
    getChapters(id: string): Promise<Content[]>;
    /**
     * @description Fetches sources for a provider and caches it if necessary
     * @param id AniList ID
     * @param providerName Name of the provider
     * @param watchId Watch ID
     * @returns Promise<SubbedSource>
     */
    getSources(id: string, providerName: string, watchId: string): Promise<SubbedSource>;
    /**
     * @description Fetches pages for a provider and caches it if necessary
     * @param id AniList ID
     * @param providerName Name of the provider
     * @param readId Read ID
     * @returns Promise<SubbedSource>
     */
    getPages(id: string, providerName: string, readId: string): Promise<Page[]>;
    /**
     * @description Gets the relations of a media
     * @param id AniList ID
     * @returns [{ data: FormattedResponse, type: Type, relationType: string }]
     */
    getRelations(id: string): Promise<any[]>;
    /**
     * @description Crawls the provider for media.
     * @param type Type of media to crawl
     * @param maxIds Max IDs to crawl
     * @returns Promise<any>
     */
    crawl(type: Type, maxIds?: number): Promise<FormattedResponse[]>;
    getRecentEpisodes(): Promise<FormattedResponse[]>;
    /**
    * @description Formats search responses so that all connectors are assigned to one AniList media object.
    * @param results Search results
    * @returns FormattedResponse[]
    */
    private formatSearch;
    /**
     * @description Compares the similarity between the external title and the title from the provider.
     * @param externalTitle Title from AniList/MAL
     * @param title Title from provider
     * @param titleArray Alt titles from provider
     * @returns { same: boolean, value: number }
     */
    similarity(externalTitle: any, title: any, titleArray?: string[]): {
        same: boolean;
        value: number;
    };
    /**
     * @description Used for removing unnecessary information from the title.
     * @param title Title to sanitize.
     * @returns string
     */
    sanitizeTitle(title: any): string;
    /**
     * @description Compares two responses and replaces results that have a better response
     * @param curVal Original response
     * @param newVal New response to compare
     * @param threshold Optional minimum threshold required
     * @returns FormattedResponse[]
     */
    private searchCompare;
    /**
     * @description Gets all media cached
     * @param type Type of media to get
     * @returns Promise<FormattedResponse[]>
     */
    getAll(type: Type): Promise<FormattedResponse[]>;
    /**
     * @description Exports the database to a JSON file.
     * @param type Type of media to export
     */
    export(): Promise<void>;
    /**
     * @description Imports a JSON file into the database.
     * @param type Type of media to export
     */
    import(): Promise<void>;
    /**
     * @description Converts the provider to it's object
     * @param url URL of a provider
     * @returns any
     */
    private fetchProvider;
    private fetchProviderByName;
    /**
     * @description Sends a request to an image and returns an array buffer
     * @param url Image URL
     * @param options axios options
     * @returns Array Buffer
     */
    getImage(url: string, options: {}): Promise<any>;
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
    id: string;
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
    episodes: Episode[];
}
interface Options {
    debug?: boolean;
    cache_timeout?: number;
    encryptionKey?: string;
    storage?: string;
    isMacOS?: boolean;
    poppler_path?: string;
    web_server?: {
        url?: string;
        main_url?: string;
        cors?: [string];
        port?: number;
    };
    AniList?: {
        SEASON?: string;
        SEASON_YEAR?: number;
        NEXT_SEASON?: string;
        NEXT_YEAR?: number;
        oath_id?: number;
        oath_secret?: string;
    };
    database_url?: string;
    is_sqlite?: boolean;
}
export type { Result, Provider, FormattedResponse, SearchResponse, Content, Options };
