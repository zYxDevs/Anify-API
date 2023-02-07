export default class PromiseRequest {
    private url;
    private options;
    constructor(url: string, options: Options);
    request(): Promise<Response>;
    stream(stream: any): Promise<unknown>;
}
type Options = {
    method?: string;
    headers?: {
        [key: string]: string;
    };
    body?: string | URLSearchParams | FormData | any;
    maxRedirects?: number;
    stream?: boolean;
    responseType?: string;
};
interface Response {
    request: Request;
    status: number;
    statusText: string;
    url: string;
    error: string[];
    headers: {
        [key: string]: string;
    } | Headers;
    toString: () => string;
    raw: () => any;
    text: () => string;
    json: () => any;
}
interface Request {
    url: string;
    options: Options;
}
export type { Options, Response, Request };
