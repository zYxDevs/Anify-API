import { config } from "../../config";
import API, { ProviderType } from "../../API";

export default class AniList extends API {
    private api:string = "https://graphql.anilist.co";
    public id:string = undefined;
    public type:Type["ANIME"]|Type["MANGA"] = undefined;
    private format:Format = undefined;
    public isMal:boolean = false;
    private config = config.mapping.provider.AniList;

    private query:string = `
    id
    idMal
    title {
        romaji
        english
        native
    }
    coverImage {
        extraLarge
        large
    }
    bannerImage
    startDate {
        year
        month
        day
    }
    endDate {
        year
        month
        day
    }
    description
    season
    seasonYear
    type
    format
    status(version: 2)
    episodes
    duration
    chapters
    volumes
    genres
    synonyms
    source(version: 3)
    isAdult
    meanScore
    averageScore
    popularity
    favourites
    countryOfOrigin
    isLicensed
    airingSchedule {
        edges {
            node {
                airingAt
                timeUntilAiring
                episode
            }
        }
    }
    relations {
        edges {
            id
            relationType(version: 2)
            node {
                id
                title {
                    userPreferred
                }
                format
                type
                status(version: 2)
                bannerImage
                coverImage {
                    large
                }
            }
        }
    }
    characterPreview: characters(perPage: 6, sort: [ROLE, RELEVANCE, ID]) {
        edges {
            id
            role
            name
            voiceActors(language: JAPANESE, sort: [RELEVANCE, ID]) {
                id
                name {
                    userPreferred
                }
                language: languageV2
                image {
                    large
                }
            }
            node {
                id
                name {
                    userPreferred
                }
                image {
                    large
                }
            }
        }
    }
    studios {
        edges {
            isMain
            node {
                id
                name
            }
        }
    }
    streamingEpisodes {
        title
        thumbnail
        url
    }
    trailer {
        id
        site
    }
    tags {
        id
        name
    }
    `;

    constructor(id?:string, type?:Type["ANIME"]|Type["MANGA"], format?:Format, isMal?:boolean) {
        super(ProviderType.META);
        this.id = this.parseURL(id);
        this.isMal = isMal;
        this.type = type ? type : "ANIME";
        this.format = format ? format : Format.TV;
    }

    public parseURL(id?:any):string {
        id = id ? id : this.id;
        if (!id) {
            return undefined;
        }
        if (id.includes("anilist.co")) {
            return id.split("https://anilist.co/")[1].split("/")[1];
        } else {
            return id;
        }
    }

    public async search(query:string, page?:number, perPage?:number, type?:Type["ANIME"]|Type["MANGA"], format?:Format, sort?:Sort): Promise<SearchResponse> {
        page = page ? page : 0;
        perPage = perPage ? perPage : 18;
        type = type ? type : this.type;
        format = format ? format : this.format;
        sort = sort ? sort : Sort.POPULARITY_DESC;
        this.format = format;
        if (!this.type || !this.format) {
            throw new Error("No format/type provided.");
        }

        const aniListArgs = {
            query: `
            query($page: Int, $perPage: Int, $search: String, $type: MediaType, $sort: [MediaSort], $format: MediaFormat) {
                Page(page: $page, perPage: $perPage) {
                    pageInfo {
                        total
                        currentPage
                        lastPage
                        hasNextPage
                        perPage
                    }
                    media(type: $type, search: $search, sort: $sort, format: $format) {
                        ${this.query}
                    }
                }
            }
            `,
            variables: {
                search: query,
                page: page,
                perPage: perPage,
                type: type,
                format: format,
                sort: sort
            }
        }

        try {
            const req = await this.fetch(this.api, {
                body: JSON.stringify(aniListArgs),
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                }
            });
    
            const data:SearchResponse = req.json();
            if (!data || !data.data || !data.data.Page.pageInfo || !data.data.Page.media) {
                throw new Error(req.text());
            }
    
            return data;
        } catch (e) {
            throw new Error(e.message);
        }
    }

    public async searchGenres(included?:Genres[], excluded?:Genres[], page?:number, perPage?:number, type?:Type["ANIME"]|Type["MANGA"], format?:Format, sort?:Sort): Promise<SearchResponse> {
        included = included ? included : [];
        excluded = excluded ? excluded : [];
        page = page ? page : 0;
        perPage = perPage ? perPage : 18;
        type = type ? type : this.type;
        format = format ? format : this.format;
        sort = sort ? sort : Sort.POPULARITY_DESC;
        this.format = format;

        const aniListArgs = {
            query: `
            query($page: Int, $perPage: Int, $type: MediaType, $format: [MediaFormat], $genres: [String], $excludedGenres: [String], $sort: [MediaSort]) {
                Page(page: $page, perPage: $perPage) {
                    pageInfo {
                        total
                        currentPage
                        lastPage
                        hasNextPage
                        perPage
                    }
                    media(type: $type, format_in: $format, genre_in: $genres, genre_not_in: $excludedGenres, sort: $sort) {
                        ${this.query}
                    }
                }
            }
            `,
            variables: {
                page: page,
                perPage: perPage,
                type: type,
                format: format,
                sort: sort,
                genres: included,
                excludedGenres: excluded
            }
        }

        try {
            const req = await this.fetch(this.api, {
                body: JSON.stringify(aniListArgs),
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                }
            });
    
            const data:SearchResponse = req.json();
            if (!data || !data.data || !data.data.Page.pageInfo || !data.data.Page.media) {
                throw new Error(req.text());
            }
    
            return data;
        } catch (e) {
            throw new Error(e.message);
        }
    }

    public async malToAniList(id?:string, type?:Type["ANIME"]|Type["MANGA"], wait?:number):Promise<string> {
        if (!this.isMal) {
            id = id ? id : this.id;
            type = type ? type : this.type;
        } else {
            id = this.id;
            type = type ? type : this.type;
        }

        if (!type || !id) {
            throw new Error("No format or id provided.");
        }

        const aniListArgs = {
            query: `
            query ($id: Int, $format: MediaType) {
                Media(idMal: $id, type: $format) {
                    id
                    idMal
                }
            }
            `,
            variables: { "id": id, "format": type }
        }

        if (wait) {
            await this.wait(wait);
        }
        try {
            const req = await this.fetch(this.api, {
                body: JSON.stringify(aniListArgs),
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                }
            });
    
            const data = req.json();
            if (!data || !data.data || !data.data.Media.id) {
                throw new Error(req.text());
            }
    
            this.id = data.data.Media.id;
            this.type = type;
    
            return data.data.Media.id;
        } catch (e) {
            throw new Error(e.message);
        }
    }

    public async getInfo(wait?:number): Promise<AniListResponse> {
        let aniListArgs;

        if (!this.format || !this.id) {
            throw new Error("No format or id provided.");
        }

        if (this.isMal) {
            aniListArgs = {
                query: `
                query($id: Int, $format: MediaType) {
                    Media(idMal: $id, type: $format) {
                        ${this.query}
                    }
                }
                `,
                variables: { "id": this.id, "format": this.format }
            };
        } else {
            aniListArgs = {
                query: `
                query($id: Int) {
                    Media(idMal: $id) {
                        ${this.query}
                    }
                }
                `,
                variables: { "id": this.id }
            };
        }

        if (wait) {
            await this.wait(wait);
        }
        try {
            const req = await this.fetch(this.api, {
                body: JSON.stringify(aniListArgs),
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                }
            });

            if (!req) {
                throw new Error("Request failed.")
            }
    
            const data = req.json();
            if (!data || !data.data || !data.data.Media.id) {
                throw new Error(req.text());
            }
            return data;
        } catch (e) {
            throw new Error(e.message);
        }
    }

    public updateId(id:string) {
        this.id = id;
    }

    public updateType(type:Type["ANIME"]|Type["MANGA"]) {
        this.type = type;
    }

    public updateMal(isMal:boolean) {
        this.isMal = isMal;
    }

    public async getSeasonal(page?:number, perPage?:number, type?:Type["ANIME"]|Type["MANGA"]): Promise<SeasonalResponse> {
        page = page ? page : 0;
        perPage = perPage ? perPage : 6;
        type = type ? type : this.type;

        if (!type) {
            throw new Error("No type specified.");
        }

        const aniListArgs = {
            query: `
            query($season: MediaSeason, $seasonYear: Int, $nextSeason: MediaSeason, $nextYear: Int) {
                trending: Page(page: ${page}, perPage: ${perPage}) {
                    media(sort: TRENDING_DESC, type: ${type}, isAdult: false) {
                        ...media
                    }
                }
                season: Page(page: ${page}, perPage: ${perPage}) {
                    media(season: $season, seasonYear: $seasonYear, sort: POPULARITY_DESC, type: ${type}, isAdult: false) {
                        ...media
                    }
                }
                nextSeason: Page(page: ${page}, perPage: ${perPage}) {
                    media(season: $nextSeason, seasonYear: $nextYear, sort: POPULARITY_DESC, type: ${type}, isAdult: false) {
                        ...media
                    }
                }
                popular: Page(page: ${page}, perPage: ${perPage}) {
                    media(sort: POPULARITY_DESC, type: ${type}, isAdult: false) {
                        ...media
                    }
                }
                top: Page(page: ${page}, perPage: ${perPage}) {
                    media(sort: SCORE_DESC, type: ${type}, isAdult: false) {
                        ...media
                    }
                }
            }
            
            fragment media on Media {
                ${this.query}
            }
            `,
            variables: {
                "type": type,
                "season": this.config.SEASON,
                "seasonYear": this.config.SEASON_YEAR,
                "nextSeason": this.config.NEXT_SEASON,
                "nextYear": this.config.NEXT_YEAR
            }
        }

        try {
            const req = await this.fetch(this.api, {
                body: JSON.stringify(aniListArgs),
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                }
            });
    
            const data = req.json();
            if (!data || !data.data) {
                throw new Error(req.text());
            }
            return data;
        } catch (e) {
            throw new Error(e.message);
        }
    }

    public async auth(code:string): Promise<AuthResponse> {
        const options = {
            uri: 'https://anilist.co/api/v2/oauth/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            json: {
                'grant_type': 'authorization_code',
                'client_id': this.config.oath_id,
                'client_secret': this.config.oath_secret,
                'redirect_uri': config.web_server.url + "/auth",
                'code': code,
            }
        };

        const req = await this.fetch(options.uri, {
            body: JSON.stringify(options.json),
            method: options.method,
            headers: options.headers
        }).catch((err) => {
            console.error(err);
            return null;
        });
        const data = req.json();
        return data;
    }

    public async getUser(username:string): Promise<UserResponse> {
        const options = {
            uri: this.api,
            method: 'POST',
            json: {
                query: `
                query($id: Int, $name: String) {
                    User(id: $id, name: $name) {
                        id name previousNames {
                            name updatedAt
                        }
                        avatar {
                            large
                        }
                        bannerImage about isFollowing isFollower donatorTier donatorBadge createdAt moderatorRoles isBlocked bans options {
                            profileColor restrictMessagesToFollowing
                        }
                        mediaListOptions {
                            scoreFormat
                        }
                        statistics {
                            anime {
                                count meanScore standardDeviation minutesWatched episodesWatched genrePreview: genres(limit: 10, sort: COUNT_DESC) {
                                    genre count
                                }
                            }
                            manga {
                                count meanScore standardDeviation chaptersRead volumesRead genrePreview: genres(limit: 10, sort: COUNT_DESC) {
                                    genre count
                                }
                            }
                        }
                        stats {
                            activityHistory {
                                date amount level
                            }
                        }
                        favourites {
                            anime {
                                edges {
                                    favouriteOrder node {
                                        id type status(version: 2) format isAdult bannerImage title {
                                            userPreferred
                                        }
                                        coverImage {
                                            large
                                        }
                                        startDate {
                                            year
                                        }
                                    }
                                }
                            }
                            manga {
                                edges {
                                    favouriteOrder node {
                                        id type status(version: 2) format isAdult bannerImage title {
                                            userPreferred
                                        }
                                        coverImage {
                                            large
                                        }
                                        startDate {
                                            year
                                        }
                                    }
                                }
                            }
                            characters {
                                edges {
                                    favouriteOrder node {
                                        id name {
                                            userPreferred
                                        }
                                        image {
                                            large
                                        }
                                    }
                                }
                            }
                            staff {
                                edges {
                                    favouriteOrder node {
                                        id name {
                                            userPreferred
                                        }
                                        image {
                                            large
                                        }
                                    }
                                }
                            }
                            studios {
                                edges {
                                    favouriteOrder node {
                                        id name
                                    }
                                }
                            }
                        }
                    }
                }
                `,
                variables: {
                    "name": username,
                }
            }
        };

        const req = await this.fetch(options.uri, {
            body: JSON.stringify(options.json),
            method: options.method,
            headers: {
                "Content-Type": "application/json",
            }
        }).catch((err) => {
            console.error(err);
            return null;
        });
        const data = req.json();
        return data;
    }

    public async getViewer(token:string): Promise<UserResponse> {
        const options = {
            uri: this.api,
            method: 'POST',
            json: {
                query: `
                query {
                    Viewer {
                        id
                        name
                        previousNames {
                            name
                            updatedAt
                        }
                        avatar {
                            large
                        }
                        bannerImage
                        about
                        isFollowing
                        isFollower
                        donatorTier
                        donatorBadge
                        createdAt
                        moderatorRoles
                        isBlocked
                        bans
                        options {
                            profileColor
                            restrictMessagesToFollowing
                        }
                        mediaListOptions {
                            scoreFormat
                        }
                        statistics {
                            anime {
                                count
                                meanScore
                                standardDeviation
                                minutesWatched
                                episodesWatched
                                genrePreview: genres(limit: 10, sort: COUNT_DESC) {
                                    genre
                                    count
                                }
                            }
                            manga {
                                count
                                meanScore
                                standardDeviation
                                chaptersRead
                                volumesRead
                                genrePreview: genres(limit: 10, sort: COUNT_DESC) {
                                    genre
                                    count
                                }
                            }
                        }
                        stats {
                            activityHistory {
                                date
                                amount
                                level
                            }
                        }
                        favourites {
                            anime {
                                edges {
                                    favouriteOrder
                                    node {
                                        id
                                        type
                                        status(version: 2)
                                        format
                                        isAdult
                                        bannerImage
                                        title {
                                            userPreferred
                                        }
                                        coverImage {
                                            large
                                        }
                                        startDate {
                                            year
                                        }
                                    }
                                }
                            }
                            manga {
                                edges {
                                    favouriteOrder
                                    node {
                                        id
                                        type
                                        status(version: 2)
                                        format
                                        isAdult
                                        bannerImage
                                        title {
                                            userPreferred
                                        }
                                        coverImage {
                                            large
                                        }
                                        startDate {
                                            year
                                        }
                                    }
                                }
                            }
                            characters {
                                edges {
                                    favouriteOrder
                                    node {
                                        id
                                        name {
                                            userPreferred
                                        }
                                        image {
                                            large
                                        }
                                    }
                                }
                            }
                            staff {
                                edges {
                                    favouriteOrder
                                    node {
                                        id
                                        name {
                                            userPreferred
                                        }
                                        image {
                                            large
                                        }
                                    }
                                }
                            }
                            studios {
                                edges {
                                    favouriteOrder
                                    node {
                                        id
                                        name
                                    }
                                }
                            }
                        }
                    }
                }
                `,
                variables: {
                }
            }
        };

        const req = await this.fetch(options.uri, {
            body: JSON.stringify(options.json),
            method: options.method,
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        }).catch((err) => {
            console.error(err);
            return null;
        });
        const data = req.json();
        return data;
    }

    public async getList(userId:number, type?:Type["ANIME"]|Type["MANGA"]):Promise<ListResponse> {
        type = type ? type : "ANIME";
        const aniListArgs = {
            query: `
                query($userId: Int, $userName: String, $type: MediaType) {
                MediaListCollection(userId: $userId, userName: $userName, type: $type) {
                    lists {
                        name isCustomList isCompletedList: isSplitCompletedList entries {
                            ...mediaListEntry
                        }
                    }
                    user {
                        id name avatar {
                            large
                        }
                        mediaListOptions {
                            scoreFormat rowOrder animeList {
                                sectionOrder customLists splitCompletedSectionByFormat theme
                            }
                            mangaList {
                                sectionOrder customLists splitCompletedSectionByFormat theme
                            }
                        }
                    }
                }
            }
            fragment mediaListEntry on MediaList {
                id mediaId status score progress progressVolumes repeat priority private hiddenFromStatusLists customLists advancedScores notes updatedAt startedAt {
                    year month day
                }
                completedAt {
                    year month day
                }
                media {
                    id title {
                        userPreferred romaji english native
                    }
                    coverImage {
                        extraLarge large
                    }
                    type format status(version: 2) episodes volumes chapters averageScore popularity isAdult countryOfOrigin genres bannerImage startDate {
                        year month day
                    }
                }
            }`,
            variables: {
                userId: userId,
                type: type
            }
        }

        const req = await this.fetch(this.api, {
            body: JSON.stringify(aniListArgs),
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
        }).catch((err) => {
            console.error(err);
            return null;
        });
        if (!req) {
            return null;
        }
        const data = req.json();
        return data;
    }

    public async updateList(variables:ListVariables, token:string):Promise<UpdateResponse> {
        const aniListArgs = {
            query: `
            mutation($id: Int $mediaId: Int $status: MediaListStatus $score: Float $progress: Int $progressVolumes: Int $repeat: Int $private: Boolean $notes: String $customLists: [String] $hiddenFromStatusLists: Boolean $advancedScores: [Float] $startedAt: FuzzyDateInput $completedAt: FuzzyDateInput) {
                SaveMediaListEntry(id: $id mediaId: $mediaId status: $status score: $score progress: $progress progressVolumes: $progressVolumes repeat: $repeat private: $private notes: $notes customLists: $customLists hiddenFromStatusLists: $hiddenFromStatusLists advancedScores: $advancedScores startedAt: $startedAt completedAt: $completedAt) {
                    id mediaId status score advancedScores progress progressVolumes repeat priority private hiddenFromStatusLists customLists notes updatedAt startedAt {
                        year month day
                    }
                    completedAt {
                        year month day
                    }
                    user {
                        id name
                    }
                    media {
                        id title {
                            userPreferred
                        }
                        coverImage {
                            large
                        }
                        type format status episodes volumes chapters averageScore popularity isAdult startDate {
                            year
                        }
                    }
                }
            }
            `,
            variables: variables
        }
        const req = await this.fetch(this.api, {
            body: JSON.stringify(aniListArgs),
            method: "POST",
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        }).catch((err) => {
            console.error(err);
            return null;
        });
        if (!req) {
            return null;
        }
        const data = req.json();
        return data;
    }
}

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
        type: Type["ANIME"]|Type["MANGA"];
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
    }
}

interface UpdateResponse {
    data: {
        SaveMediaListEntry: ListVariables;
    }
}

interface ListVariables {
    id?: number;
    mediaId: number|string;
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
interface Type {
    ANIME: "ANIME",
    MANGA: "MANGA"
}

export enum Format {
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

export enum Sort {
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

export enum Genres {
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

export enum Status {
    CURRENT = "CURRENT",
    PLANNING = "PLANNING",
    COMPLETED = "COMPLETED",
    DROPPED = "DROPPED",
    PAUSED = "PAUSED",
    REPEATING = "REPEATING"
}

interface AniListResponse {
    data: {
        Media: Media;
    }
}

interface Media {
    id:number;
    idMal:number;
    title: Title;
    coverImage: {
        extraLarge:string;
        large:string;
    };
    bannerImage:string;
    startDate: {
        year:number;
        month:number;
        day:number;
    };
    endDate: {
        year:number;
        month:number;
        day:number;
    };
    description:string;
    season:"WINTER"|"SPRING"|"SUMMER"|"FALL";
    seasonYear:number;
    type:Type["ANIME"]|Type["MANGA"];
    format:Format;
    status:"FINISHED"|"RELEASING"|"NOT_YET_RELEASED"|"CANCELLED";
    episodes?:number;
    duration?:number;
    chapters?:number;
    volumes?:number;
    genres:string[];
    synonyms:string[]
    source:"ORIGINAL"|"LIGHT_NOVEL"|"VISUAL_NOVEL"|"VIDEO_GAME"|"OTHER"|"NOVEL"|"MANGA"|"DOUJINSHI"|"ANIME"|"WEB_MANGA"|"BOOK"|"CARD_GAME"|"COMIC"|"GAME"|"MUSIC"|"NOVEL"|"ONE_SHOT"|"OTHER"|"PICTURE_BOOK"|"RADIO"|"TV"|"UNKNOWN";
    isAdult:boolean;
    meanScore:number;
    averageScore:number;
    popularity:number;
    favourites:number;
    countryOfOrigin:string;
    isLicensed:boolean;
    airingSchedule: {
        edges: {
            node: {
                airingAt?:any;
                timeUntilAiring?:any
                episode?:any;
            }
        }
    }
    relations: {
        edges: [RelationsNode]
    };
    characterPreview: {
        edges: {
            id:number;
            role:string;
            name?:string;
            voiceActors: {
                id:number;
                name: {
                    userPreferred:string;
                };
                language:string;
                image: {
                    large:string;
                };
            };
            node: {
                id:number;
                name: {
                    userPreferred:string;
                };
                image: {
                    large:string;
                };
            };
        };
    };
    studios: {
        edges: {
            isMain:boolean;
            node: {
                id:number;
                name:string;
            };
        };
    };
    streamingEpisodes: {
        title?:string;
        thumbnail?:string;
        url?:string;
    };
    trailer: {
        id:string;
        site:string;
    };
    tags: {
        id:number;
        name:string;
    };
};

interface Title {
    english?: string;
    romaji?: string;
    native?: string;
}

interface RelationsNode {
    id:number;
    relationType:string;
    node: {
        id:number;
        title: {
            userPreferred:string;
        };
        format:Format;
        type:Type["ANIME"]|Type["MANGA"];
        status:string;
        bannerImage:string;
        coverImage: {
            large:string;
        }
    };
}

interface SearchResponse {
    data: {
        Page: {
            pageInfo: {
                total: number;
                currentPage: number;
                lastPage: number;
                hasNextPage: boolean;
                perPage: number;
            }
            media: Array<Media>
        }
    }
}

interface SeasonalResponse {
    data: {
        trending: {
            media: Array<Media>
        },
        season: {
            media: Array<Media>
        },
        nextSeason: {
            media: Array<Media>
        },
        popular: {
            media: Array<Media>
        },
        top: {
            media: Array<Media>
        }
    }
}

interface UserResponse {
    data: {
        User: {
            id:number;
            name: string;
            previousNames: [string];
            avatar: {
                large:string;
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
                }
                manga: {
                    nodes: [Media];
                }
                characters: {
                    nodes: [Media];
                }
                staff: {
                    nodes: [Media];
                }
                studios: {
                    nodes: [Media];
                }
            };
        };
    };
}

export type { Type, Media, SearchResponse, SeasonalResponse, UserResponse };