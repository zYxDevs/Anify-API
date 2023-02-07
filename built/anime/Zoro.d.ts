import Provider, { Episode, StreamingServers, SubbedSource } from "../Provider";
import { Result } from "../Core";
export default class Zoro extends Provider {
    private api;
    constructor();
    search(query: string): Promise<Array<Result>>;
    getEpisodes(id: string): Promise<Episode[]>;
    getSources(id: string, server?: StreamingServers): Promise<SubbedSource>;
    private retrieveServerId;
}
