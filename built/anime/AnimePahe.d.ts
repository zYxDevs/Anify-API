import Provider, { Episode, SubbedSource } from "../Provider";
import { Result } from "../Core";
export default class AnimePahe extends Provider {
    constructor();
    search(query: string): Promise<Array<Result>>;
    getEpisodes(id: string): Promise<Episode[]>;
    getSources(id: string): Promise<SubbedSource>;
}
