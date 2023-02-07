import Provider from "../Provider";
import { Result } from "../Core";
export default class AnimeThemes extends Provider {
    private graphql;
    private api;
    constructor();
    search(query: string): Promise<Array<Result>>;
    getThemes(id: string): Promise<any>;
    getArtist(query: string): Promise<ArtistResult>;
    getImage(): Promise<ImageResponse>;
    getRecentlyAdded(): Promise<RecentlyAdded>;
}
interface ImageResponse {
    images: [Image];
    links: [Link];
    meta: {
        current_page: number;
        from: number;
        path: string;
        per_page: number;
        to: number;
    };
}
interface Image {
    id?: number;
    path?: string;
    facet: string;
    created_at?: string | null;
    updated_at?: string | null;
    deleted_at?: string | null;
    link: string;
    __typename?: string;
}
interface Link {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
}
interface RecentlyAdded {
    data: {
        recentlyAdded: [RecentResult];
    };
}
interface RecentResult {
    slug: string;
    __typename: string;
    id: number;
    song: {
        title: string;
        __typename: string;
        performances: [Performance];
    };
    type: string;
    sequence: number;
    group: number | null;
    anime: {
        slug: string;
        name: string;
        __typename: string;
        images: [Image];
    };
    entries: [Entry];
}
interface Performance {
    as: string | null;
    artist: {
        slug: string;
        name: string;
        __typename: string;
    };
    __typename: string;
}
interface Entry {
    version: number;
    videos: [Video];
    __typename: string;
}
interface Video {
    tags: [string];
    __typename: string;
}
interface ArtistResult {
    artists: [Artist];
    links: [Link];
    meta: {
        current_page: number;
        from: number;
        path: string;
        per_page: number;
        to: number;
        links: [Link];
    };
}
interface Artist {
    created_at: string;
    updated_at: string;
    id: number;
    name: string;
    slug: string;
    images: [Image];
}
export {};
