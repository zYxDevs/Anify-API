import Provider from "../Provider";
export default class AniList extends Provider {
    private api;
    requests: number;
    rateLimit: number;
    id: string;
    type: Type;
    private query;
    constructor();
    /**
     * @description Searches on AniList for media
     * @param query Media to search for
     * @param type The type of media to search for
     * @param page Page to start searching
     * @param perPage Amount of media per page
     * @returns Promise<Media[]>
     */
    search(query: string, type: Type, page?: number, perPage?: number): Promise<Media[]>;
    /**
     * @description Sends a request to AniList and fetches information about the media
     * @param id AniList ID
     * @returns Promise<Media>
     */
    getMedia(id: string): Promise<Media>;
    /**
     * @description Fetches all anime AniList ID's from AniList's sitemap
     * @returns Promise<string[]>
     */
    getAnimeIDs(): Promise<string[]>;
    /**
     * @description Fetches all manga AniList ID's from AniList's sitemap
     * @returns Promise<string[]>
     */
    getMangaIDs(): Promise<string[]>;
    getSeasonal(type?: Type, page?: number, perPage?: number): Promise<SeasonalResponse>;
    /**
     * @description Custom request function for handling AniList rate limit.
     */
    private request;
    /**
     * @description Authenticates an user and returns an authentication token.
     * @param code Auth code
     * @returns Promise<AuthResponse>
     */
    auth(code: string): Promise<AuthResponse>;
    /**
     * @description Fetches information about an user
     * @param username Username to query
     * @returns Promise<UserResponse>
     */
    getUser(username: string): Promise<UserResponse>;
    /**
     * @description Fetches the list of the currently logged-in user
     * @param token Authentication token
     * @returns Promise<UserResponse>
     */
    getViewer(token: string): Promise<UserResponse>;
    /**
     * @description Gets the list of an user
     * @param userId The user ID to query
     * @param type Type of list to get (eg. anime/manga)
     * @returns Promise<ListResponse>
     */
    getList(userId: number, type?: Type): Promise<ListResponse>;
    /**
     * @description Updates the currently logged-in user's list
     * @param variables Controls the way a list is updated
     * @param token Authentication token
     * @returns Promise<UpdateResponse>
     */
    updateList(variables: ListVariables, token: string): Promise<UpdateResponse>;
}
export declare function search(query: string, type: Type, page?: number, perPage?: number): Promise<Media[]>;
export declare function getMedia(id: string): Promise<Media>;
export declare function getAnimeIDs(): Promise<string[]>;
export declare function getMangaIDs(): Promise<string[]>;
interface ListResponse {
    data: {
        MediaListCollection: {
            lists: [List];
            user: {
                id: number;
                name: string;
                avatar: {
                    large: string;
                };
                mediaListOptions: {
                    scoreFormat: string;
                    rowOrder: string;
                    animeList: {
                        sectionOrder: [string];
                        customLists: [string];
                        splitCompletedSectionByFormat: boolean;
                        theme: {
                            themeType: string;
                            theme: string;
                            coverImages: string;
                        };
                    };
                    mangaList: {
                        sectionOrder: [string];
                        customLists: [string];
                        splitCompletedSectionByFormat: boolean;
                        theme: {
                            themeType: string;
                            theme: string;
                            coverImages: string;
                        };
                    };
                };
            };
        };
    };
}
interface List {
    name: string;
    isCustomList: boolean;
    isCompleteList: boolean;
    entries: [ListEntry];
}
interface ListEntry {
    id: number;
    mediaId: number;
    status: string;
    score: number;
    progress: number;
    progressVolumes?: number;
    repeat: number;
    priority: number;
    private: boolean;
    hiddenFromStatusLists: boolean;
    customLists?: [string];
    advancedScores: {
        Story: number;
        Characters: number;
        Visuals: number;
        Audio: number;
        Enjoyment: number;
    };
    notes?: string;
    updatedAt: number;
    startedAt: {
        year?: number;
        month?: number;
        day?: number;
    };
    completedAt: {
        year?: number;
        month?: number;
        day?: number;
    };
    media: {
        id: number;
        title: Title;
        coverImage: {
            extraLarge: string;
            large: string;
        };
        type: Type;
        format: Format;
        status: string;
        episodes: number;
        volumes?: number;
        chapters?: number;
        averageScore: number;
        popularity: number;
        isAdult: boolean;
        countryOfOrigin: string;
        genres: [string];
        bannerImage: string;
        startDate: {
            year?: number;
            month?: number;
            day?: number;
        };
    };
}
interface UpdateResponse {
    data: {
        SaveMediaListEntry: ListVariables;
    };
}
interface ListVariables {
    id?: number;
    mediaId: number | string;
    progress?: number;
    progressVolumes?: number;
    score?: number;
    repeat?: number;
    priority?: number;
    private?: boolean;
    notes?: string;
    status?: Status;
    hiddenFromStatusLists?: boolean;
    customLists?: [string];
    advancedScored?: [number];
    startedAt?: number;
    completedAt?: number;
}
interface AuthResponse {
    token_type: string;
    expires_in: number;
    access_token: string;
}
export declare enum Type {
    ANIME = "ANIME",
    MANGA = "MANGA"
}
export declare enum Format {
    TV = "TV",
    TV_SHORT = "TV_SHORT",
    MOVIE = "MOVIE",
    SPECIAL = "SPECIAL",
    OVA = "OVA",
    ONA = "ONA",
    MUSIC = "MUSIC",
    MANGA = "MANGA",
    NOVEL = "NOVEL",
    ONE_SHOT = "ONE_SHOT"
}
export declare enum Sort {
    ID = "ID",
    ID_DESC = "ID_DESC",
    TITLE_ROMAJI = "TITLE_ROMAJI",
    TITLE_ROMAJI_DESC = "TITLE_ROMAJI_DESC",
    TYPE = "TYPE",
    FORMAT = "FORMAT",
    FORMAT_DESC = "FORMAT_DESC",
    SCORE = "SCORE",
    SCORE_DESC = "SCORE_DESC",
    POPULARITY = "POPULARITY",
    POPULARITY_DESC = "POPULARITY_DESC",
    TRENDING = "TRENDING",
    TRENDING_DESC = "TRENDING_DESC",
    CHAPTERS = "CHAPTERS",
    CHAPTERS_DESC = "CHAPTERS_DESC",
    VOLUMES = "VOLUMES",
    UPDATED_AT = "UPDATED_AT",
    UPDATED_AT_DESC = "UPDATED_AT_DESC"
}
export declare enum Genres {
    ACTION = "Action",
    ADVENTURE = "Adventure",
    COMEDY = "Comedy",
    DRAMA = "Drama",
    ECCHI = "Ecchi",
    FANTASY = "Fantasy",
    HORROR = "Horror",
    MAHOU_SHOUJO = "Mahou Shoujo",
    MECHA = "Mecha",
    MUSIC = "Music",
    MYSTERY = "Mystery",
    PSYCHOLOGICAL = "Psychological",
    ROMANCE = "Romance",
    SCI_FI = "Sci-Fi",
    SLICE_OF_LIFE = "Slice of Life",
    SPORTS = "Sports",
    SUPERNATURAL = "Supernatural",
    THRILLER = "Thriller"
}
export declare enum Status {
    CURRENT = "CURRENT",
    PLANNING = "PLANNING",
    COMPLETED = "COMPLETED",
    DROPPED = "DROPPED",
    PAUSED = "PAUSED",
    REPEATING = "REPEATING"
}
interface SeasonalResponse {
    data: {
        trending: {
            media: Array<Media>;
        };
        season: {
            media: Array<Media>;
        };
        nextSeason: {
            media: Array<Media>;
        };
        popular: {
            media: Array<Media>;
        };
        top: {
            media: Array<Media>;
        };
    };
}
interface Media {
    id: number;
    idMal: number;
    title: Title;
    coverImage: {
        extraLarge: string;
        large: string;
    };
    bannerImage: string;
    startDate: {
        year: number;
        month: number;
        day: number;
    };
    endDate: {
        year: number;
        month: number;
        day: number;
    };
    description: string;
    season: "WINTER" | "SPRING" | "SUMMER" | "FALL";
    seasonYear: number;
    type: Type;
    format: Format;
    status: "FINISHED" | "RELEASING" | "NOT_YET_RELEASED" | "CANCELLED";
    episodes?: number;
    duration?: number;
    chapters?: number;
    volumes?: number;
    genres: string[];
    synonyms: string[];
    source: "ORIGINAL" | "LIGHT_NOVEL" | "VISUAL_NOVEL" | "VIDEO_GAME" | "OTHER" | "NOVEL" | "MANGA" | "DOUJINSHI" | "ANIME" | "WEB_MANGA" | "BOOK" | "CARD_GAME" | "COMIC" | "GAME" | "MUSIC" | "NOVEL" | "ONE_SHOT" | "OTHER" | "PICTURE_BOOK" | "RADIO" | "TV" | "UNKNOWN";
    isAdult: boolean;
    meanScore: number;
    averageScore: number;
    popularity: number;
    favourites: number;
    countryOfOrigin: string;
    isLicensed: boolean;
    airingSchedule: {
        edges: {
            node: {
                airingAt?: any;
                timeUntilAiring?: any;
                episode?: any;
            };
        };
    };
    relations: {
        edges: [RelationsNode];
    };
    characterPreview: {
        edges: {
            id: number;
            role: string;
            name?: string;
            voiceActors: {
                id: number;
                name: {
                    userPreferred: string;
                };
                language: string;
                image: {
                    large: string;
                };
            };
            node: {
                id: number;
                name: {
                    userPreferred: string;
                };
                image: {
                    large: string;
                };
            };
        };
    };
    studios: {
        edges: {
            isMain: boolean;
            node: {
                id: number;
                name: string;
            };
        };
    };
    streamingEpisodes: {
        title?: string;
        thumbnail?: string;
        url?: string;
    };
    trailer: {
        id: string;
        site: string;
    };
    tags: {
        id: number;
        name: string;
    };
}
interface Title {
    english?: string;
    romaji?: string;
    native?: string;
    userPreferred?: string;
}
interface RelationsNode {
    id: number;
    relationType: string;
    node: {
        id: number;
        title: {
            userPreferred: string;
        };
        format: Format;
        type: Type;
        status: string;
        bannerImage: string;
        coverImage: {
            large: string;
        };
    };
}
interface UserResponse {
    data: {
        User: {
            id: number;
            name: string;
            previousNames: [string];
            avatar: {
                large: string;
            };
            bannerImage: string;
            about: string;
            isFollowing: boolean;
            isFollower: boolean;
            donatorTier: number;
            donatorBadge: string;
            createdAt: number;
            moderatorRoles?: [string];
            isBlocked: boolean;
            bans: [string];
            options: {
                titleLanguage: string;
                displayAdultContent: boolean;
                airingNotifications: boolean;
                profileColor: string;
                notificationOptions: {
                    activityReply: boolean;
                    activityMention: boolean;
                    activitySubscribed: boolean;
                    activityReplySubscribed: boolean;
                    activityLike: boolean;
                    activityReplyLike: boolean;
                    activityMentionSubscribed: boolean;
                    activityReplies: boolean;
                    activityReplyLikes: boolean;
                    following: boolean;
                    threadCommentMention: boolean;
                    threadSubscribed: boolean;
                    threadCommentReply: boolean;
                    threadCommentSubscribed: boolean;
                    threadLike: boolean;
                    threadCommentLike: boolean;
                    threadCommentReplySubscribed: boolean;
                    threadCommentLikes: boolean;
                    relatedMediaAddition: boolean;
                    mediaList: boolean;
                    airing: boolean;
                    relatedMediaAnnouncement: boolean;
                    activityMessage: boolean;
                    activityMessageSubscribed: boolean;
                    activityMessageReply: boolean;
                    activityMessageReplySubscribed: boolean;
                    activityMessageLike: boolean;
                    activityMessageReplyLike: boolean;
                    activityMessageReplies: boolean;
                    activityMessageReplyLikes: boolean;
                    threadComment: boolean;
                    thread: boolean;
                    activity: boolean;
                };
            };
            mediaListOptions: {
                scoreFormat: string;
                rowOrder: string;
                animeList: {
                    sectionOrder: [string];
                    splitCompletedSectionByFormat: boolean;
                    customLists: [string];
                    advancedScoring: [string];
                    advancedScoringEnabled: boolean;
                };
                mangaList: {
                    sectionOrder: [string];
                    splitCompletedSectionByFormat: boolean;
                    customLists: [string];
                    advancedScoring: [string];
                    advancedScoringEnabled: boolean;
                };
            };
            statistics: {
                anime: {
                    count: number;
                    meanScore: number;
                    standardDeviation: number;
                    minutesWatched: number;
                    episodesWatched: number;
                    genres: [string];
                    tags: [string];
                    formats: [string];
                    statuses: [string];
                    releaseYears: [string];
                    startYears: [string];
                    countries: [string];
                    voiceActors: [string];
                    staff: [string];
                    studios: [string];
                };
                manga: {
                    count: number;
                    meanScore: number;
                    standardDeviation: number;
                    chaptersRead: number;
                    volumesRead: number;
                    genres: [string];
                    tags: [string];
                    formats: [string];
                    statuses: [string];
                    releaseYears: [string];
                    startYears: [string];
                    countries: [string];
                    staff: [string];
                    studios: [string];
                };
            };
            favourites: {
                anime: {
                    nodes: [Media];
                };
                manga: {
                    nodes: [Media];
                };
                characters: {
                    nodes: [Media];
                };
                staff: {
                    nodes: [Media];
                };
                studios: {
                    nodes: [Media];
                };
            };
        };
    };
}
export type { Media };
