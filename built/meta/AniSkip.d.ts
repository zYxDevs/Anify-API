import Provider from "../Provider";
import { Result } from "../Core";
export default class AniSkip extends Provider {
    private api;
    constructor();
    search(query: string): Promise<Array<Result>>;
    /**
     * @description Different from other providers. Retrieves the skip times for a given AniList ID
     * @param id AniList ID
     */
    getTimes(idMal: string, episodeNumber: number, episodeLength: number, types?: Types[]): Promise<any>;
}
declare enum Types {
    OP = "op",
    ED = "ed",
    MIXED_OP = "mixed-op",
    MIXED_ED = "mixed-ed",
    RECAP = "recap"
}
export {};
