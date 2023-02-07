import Provider, { Episode, StreamingServers, SubbedSource } from "../Provider";
import { Result } from "../Core";
export default class GogoAnime extends Provider {
    private api;
    constructor();
    search(query: string): Promise<Array<Result>>;
    getEpisodes(id: string): Promise<Episode[]>;
    getSources(id: string, server?: StreamingServers): Promise<SubbedSource>;
    fetchRecentEpisodes(page?: number, type?: number): Promise<RecentEpisode[]>;
}
interface RecentEpisode {
    id: string;
    episodeId: string;
    episodeNumber: number;
    title: string;
    image: string;
    url: string;
}
export {};
