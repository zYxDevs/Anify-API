import API, { ProviderType } from "./API";
export default class Provider extends API {
    baseURL: string;
    providerType: ProviderType;
    constructor(baseURL: string, type: ProviderType);
    getEpisodes(id: string): Promise<Array<Episode>>;
    getChapters(id: string): Promise<Array<Chapter>>;
    getSources(id: string): Promise<SubbedSource>;
    getPages(id: string): Promise<Array<Page>>;
    urlToId(url: string): string;
    extractGogoCDN(url: URL): Promise<SubbedSource>;
    extractStreamSB(url: URL): Promise<SubbedSource>;
    extractVidCloud(url: URL): Promise<SubbedSource>;
    extractKwik(url: URL): Promise<SubbedSource>;
    private format;
    extractStreamTape(url: URL): Promise<SubbedSource>;
    private substringBefore;
    private substringAfter;
}
interface SubbedSource {
    sources: Array<Source>;
    subtitles: Array<Subtitle>;
    intro?: {
        start: number;
        end: number;
    };
}
interface Source {
    url?: string;
    file?: string;
    isM3U8: boolean;
    quality: string;
}
interface Subtitle {
    url: string;
    lang: string;
    label: string;
}
export declare enum StreamingServers {
    AsianLoad = "asianload",
    GogoCDN = "gogocdn",
    StreamSB = "streamsb",
    MixDrop = "mixdrop",
    UpCloud = "upcloud",
    VidCloud = "vidcloud",
    StreamTape = "streamtape",
    VizCloud = "vizcloud",
    MyCloud = "mycloud",
    Filemoon = "filemoon",
    VidStreaming = "vidstreaming"
}
interface Episode {
    url: string;
    id: string;
    title: string;
}
interface Chapter {
    url: string;
    id: string;
    title: string;
}
interface Page {
    url: string;
    index: number;
}
export type { SubbedSource, Episode, Chapter, Page };
