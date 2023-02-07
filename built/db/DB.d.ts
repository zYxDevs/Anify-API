import { Content, FormattedResponse } from "../Core";
import { Type } from "../meta/AniList";
import API from "../API";
import { SubbedSource } from "../Provider";
export default class DB extends API {
    private isSQlite;
    private db;
    constructor(isSQlite?: boolean);
    init(): Promise<void>;
    private createDatabase;
    search(query: string, type: Type): Promise<FormattedResponse[]>;
    insert(data: FormattedResponse[], type: Type): Promise<void>;
    cacheContent(id: string, data: Content[], type: Type): Promise<void>;
    cacheSources(id: string, mainId: string, data: SubbedSource, type: Type): Promise<void>;
    get(id: string, type: Type): Promise<FormattedResponse>;
    getContent(id: string, type: Type): Promise<CachedContent>;
    getSources(id: string, mainId: string, type: Type): Promise<CachedSources>;
    getAll(type: Type): Promise<FormattedResponse[]>;
    export(): Promise<void>;
    import(): Promise<void>;
}
interface CachedContent {
    id: number | string;
    data: Content[];
    lastCached: number;
}
interface CachedSources {
    id: number | string;
    data: SubbedSource;
    lastCached: number;
}
export type { CachedContent, CachedSources };
