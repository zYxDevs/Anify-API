import Provider from "../Provider";
import { Result } from "../Core";
export default class TMDB extends Provider {
    private apiUrl;
    private api_key;
    constructor();
    search(query: string): Promise<Array<Result>>;
    getInfo(id: string): Promise<any>;
}
