import Provider, { Episode, SubbedSource } from "../Provider";
import { Result } from "../Core";
export default class Marin extends Provider {
    /**
     * REQUIRES MARIN MOE SESSION COOKIE
     */
    constructor();
    search(query: string): Promise<Array<Result>>;
    getEpisodes(id: string): Promise<Episode[]>;
    getSources(id: string): Promise<SubbedSource>;
    getToken(): Promise<string[]>;
}
