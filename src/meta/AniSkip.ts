import { ProviderType } from "../API";
import Provider, { SubbedSource } from "../Provider";
import { Result } from "../Core";

export default class AniSkip extends Provider {
    private api = "https://api.aniskip.com/v2";

    constructor() {
        super("https://aniskip.com", ProviderType.META);
    }

    public async search(query:string): Promise<Array<Result>> {
        return [];
    }

    /**
     * @description Different from other providers. Retrieves the skip times for a given AniList ID
     * @param id AniList ID
     */
    public async getTimes(idMal:string, episodeNumber:number, episodeLength:number, types?:Types[]) {
        types = types ? types : [Types.OP];
        const req = await this.fetch(`${this.api}/skip-times/${idMal}/${episodeNumber}?types=${types}&episodeLength=${episodeLength}`);
        const data = req.json();
        return data;
    }
}

enum Types {
    OP = "op",
    ED = "ed",
    MIXED_OP = "mixed-op",
    MIXED_ED = "mixed-ed",
    RECAP = "recap"
}