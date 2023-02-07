import Provider, { Episode, SubbedSource } from "../Provider";
import { Result } from "../Core";
export default class Enime extends Provider {
    private api;
    constructor();
    search(query: string): Promise<Array<Result>>;
    getEpisodes(id: string): Promise<Episode[]>;
    getSources(id: string): Promise<SubbedSource>;
}
