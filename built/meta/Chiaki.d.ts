import Provider from "../Provider";
import { Result } from "../Core";
export default class Chiaki extends Provider {
    constructor();
    search(query: string): Promise<Array<Result>>;
}
