import Provider from "../Provider";
import { Result } from "../Core";
export default class LiveChart extends Provider {
    constructor();
    search(query: string): Promise<Array<Result>>;
}
