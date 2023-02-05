"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Status = exports.Genres = exports.Sort = exports.Format = exports.Type = exports.getMangaIDs = exports.getAnimeIDs = exports.getMedia = exports.search = void 0;
const API_1 = require("../API");
const Provider_1 = require("../Provider");
const config = require("../config.json");
class AniList extends Provider_1.default {
    constructor() {
        super("https://anilist.co", API_1.ProviderType.META);
        this.api = "https://graphql.anilist.co";
        this.requests = 0;
        this.rateLimit = 30; // How many requests per minute
        this.id = undefined;
        this.type = undefined;
        this.query = `
    id
    idMal
    title {
        romaji
        english
        native
        userPreferred
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
    }
    /**
     * @description Searches on AniList for media
     * @param query Media to search for
     * @param type The type of media to search for
     * @param page Page to start searching
     * @param perPage Amount of media per page
     * @returns Promise<Media[]>
     */
    async search(query, type, page, perPage) {
        page = page ? page : 0;
        perPage = perPage ? perPage : 10;
        const aniListArgs = {
            query: `
            query($page: Int, $perPage: Int, $search: String, $type: MediaType) {
                Page(page: $page, perPage: $perPage) {
                    pageInfo {
                        total
                        currentPage
                        lastPage
                        hasNextPage
                        perPage
                    }
                    media(type: $type, search: $search) {
                        ${this.query}
                    }
                }
            }
            `,
            variables: {
                search: query,
                type: type,
                page: page,
                perPage: perPage
            }
        };
        const req = await this.request(this.api, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(aniListArgs)
        });
        const data = req.json();
        return data.data.Page.media;
    }
    /**
     * @description Sends a request to AniList and fetches information about the media
     * @param id AniList ID
     * @returns Promise<Media>
     */
    async getMedia(id) {
        const query = `query ($id: Int) {
            Media (id: $id) {
                ${this.query}
            }
        }`;
        const variables = {
            id: parseInt(id)
        };
        const req = await this.request(this.api, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                query,
                variables
            })
        });
        const data = req.json();
        return data.data.Media;
    }
    /**
     * @description Fetches all anime AniList ID's from AniList's sitemap
     * @returns Promise<string[]>
     */
    async getAnimeIDs() {
        const req1 = await this.request("https://anilist.co/sitemap/anime-0.xml");
        const data1 = await req1.text();
        const req2 = await this.request("https://anilist.co/sitemap/anime-1.xml");
        const data2 = await req2.text();
        const ids1 = data1.match(/anime\/([0-9]+)/g).map((id) => {
            return id.replace("anime/", "");
        });
        const ids2 = data2.match(/anime\/([0-9]+)/g).map((id) => {
            return id.replace("anime/", "");
        });
        return ids1.concat(ids2);
    }
    /**
     * @description Fetches all manga AniList ID's from AniList's sitemap
     * @returns Promise<string[]>
     */
    async getMangaIDs() {
        const req1 = await this.fetch("https://anilist.co/sitemap/manga-0.xml");
        const data1 = await req1.text();
        const req2 = await this.fetch("https://anilist.co/sitemap/manga-1.xml");
        const data2 = await req2.text();
        const ids1 = data1.match(/manga\/([0-9]+)/g).map((id) => {
            return id.replace("manga/", "");
        });
        const ids2 = data2.match(/manga\/([0-9]+)/g).map((id) => {
            return id.replace("manga/", "");
        });
        return ids1.concat(ids2);
    }
    async getSeasonal(type, page, perPage) {
        page = page ? page : 0;
        perPage = perPage ? perPage : 6;
        type = type ? type : Type.ANIME;
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
                "season": config.AniList.SEASON,
                "seasonYear": config.AniList.SEASON_YEAR,
                "nextSeason": config.AniList.NEXT_SEASON,
                "nextYear": config.AniList.NEXT_YEAR
            }
        };
        try {
            const req = await this.request(this.api, {
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
        }
        catch (e) {
            throw new Error(e.message);
        }
    }
    /**
     * @description Custom request function for handling AniList rate limit.
     */
    async request(url, options) {
        const promises = [];
        if (this.requests > this.rateLimit) {
            const promise = new Promise((resolve, reject) => {
                const interval = setInterval(() => {
                    // If the requests are below the rate limit, then resolve.
                    if (this.requests < this.rateLimit) {
                        clearInterval(interval);
                        resolve(true);
                    }
                }, 250);
            });
            promises.push(promise);
        }
        else {
            // Increment the requests if below rate limit.
            this.requests++;
            setTimeout(() => {
                // After a minute, decrement the requests.
                this.requests--;
            }, 60000);
        }
        // Await until the requests are below the rate limit.
        await Promise.all(promises);
        // Send request normally once applicable.
        const response = await this.fetch(url, options);
        return response;
    }
    /**
     * @description Authenticates an user and returns an authentication token.
     * @param code Auth code
     * @returns Promise<AuthResponse>
     */
    async auth(code) {
        const options = {
            uri: 'https://anilist.co/api/v2/oauth/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            json: {
                'grant_type': 'authorization_code',
                'client_id': config.AniList.oath_id,
                'client_secret': config.AniList.oath_secret,
                'redirect_uri': config.web_server.url + "/auth",
                'code': code,
            }
        };
        const req = await this.request(options.uri, {
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
    /**
     * @description Fetches information about an user
     * @param username Username to query
     * @returns Promise<UserResponse>
     */
    async getUser(username) {
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
        const req = await this.request(options.uri, {
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
    /**
     * @description Fetches the list of the currently logged-in user
     * @param token Authentication token
     * @returns Promise<UserResponse>
     */
    async getViewer(token) {
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
                variables: {}
            }
        };
        const req = await this.request(options.uri, {
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
    /**
     * @description Gets the list of an user
     * @param userId The user ID to query
     * @param type Type of list to get (eg. anime/manga)
     * @returns Promise<ListResponse>
     */
    async getList(userId, type) {
        type = type ? type : Type.ANIME;
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
        };
        const req = await this.request(this.api, {
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
    /**
     * @description Updates the currently logged-in user's list
     * @param variables Controls the way a list is updated
     * @param token Authentication token
     * @returns Promise<UpdateResponse>
     */
    async updateList(variables, token) {
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
        };
        const req = await this.request(this.api, {
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
exports.default = AniList;
async function search(query, type, page, perPage) {
    const self = new AniList();
    return await self.search(query, type, page, perPage);
}
exports.search = search;
async function getMedia(id) {
    const self = new AniList();
    return await self.getMedia(id);
}
exports.getMedia = getMedia;
async function getAnimeIDs() {
    const self = new AniList();
    return await self.getAnimeIDs();
}
exports.getAnimeIDs = getAnimeIDs;
async function getMangaIDs() {
    const self = new AniList();
    return await self.getMangaIDs();
}
exports.getMangaIDs = getMangaIDs;
var Type;
(function (Type) {
    Type["ANIME"] = "ANIME";
    Type["MANGA"] = "MANGA";
})(Type = exports.Type || (exports.Type = {}));
var Format;
(function (Format) {
    Format["TV"] = "TV";
    Format["TV_SHORT"] = "TV_SHORT";
    Format["MOVIE"] = "MOVIE";
    Format["SPECIAL"] = "SPECIAL";
    Format["OVA"] = "OVA";
    Format["ONA"] = "ONA";
    Format["MUSIC"] = "MUSIC";
    Format["MANGA"] = "MANGA";
    Format["NOVEL"] = "NOVEL";
    Format["ONE_SHOT"] = "ONE_SHOT";
})(Format = exports.Format || (exports.Format = {}));
var Sort;
(function (Sort) {
    Sort["ID"] = "ID";
    Sort["ID_DESC"] = "ID_DESC";
    Sort["TITLE_ROMAJI"] = "TITLE_ROMAJI";
    Sort["TITLE_ROMAJI_DESC"] = "TITLE_ROMAJI_DESC";
    Sort["TYPE"] = "TYPE";
    Sort["FORMAT"] = "FORMAT";
    Sort["FORMAT_DESC"] = "FORMAT_DESC";
    Sort["SCORE"] = "SCORE";
    Sort["SCORE_DESC"] = "SCORE_DESC";
    Sort["POPULARITY"] = "POPULARITY";
    Sort["POPULARITY_DESC"] = "POPULARITY_DESC";
    Sort["TRENDING"] = "TRENDING";
    Sort["TRENDING_DESC"] = "TRENDING_DESC";
    Sort["CHAPTERS"] = "CHAPTERS";
    Sort["CHAPTERS_DESC"] = "CHAPTERS_DESC";
    Sort["VOLUMES"] = "VOLUMES";
    Sort["UPDATED_AT"] = "UPDATED_AT";
    Sort["UPDATED_AT_DESC"] = "UPDATED_AT_DESC";
})(Sort = exports.Sort || (exports.Sort = {}));
var Genres;
(function (Genres) {
    Genres["ACTION"] = "Action";
    Genres["ADVENTURE"] = "Adventure";
    Genres["COMEDY"] = "Comedy";
    Genres["DRAMA"] = "Drama";
    Genres["ECCHI"] = "Ecchi";
    Genres["FANTASY"] = "Fantasy";
    Genres["HORROR"] = "Horror";
    Genres["MAHOU_SHOUJO"] = "Mahou Shoujo";
    Genres["MECHA"] = "Mecha";
    Genres["MUSIC"] = "Music";
    Genres["MYSTERY"] = "Mystery";
    Genres["PSYCHOLOGICAL"] = "Psychological";
    Genres["ROMANCE"] = "Romance";
    Genres["SCI_FI"] = "Sci-Fi";
    Genres["SLICE_OF_LIFE"] = "Slice of Life";
    Genres["SPORTS"] = "Sports";
    Genres["SUPERNATURAL"] = "Supernatural";
    Genres["THRILLER"] = "Thriller";
})(Genres = exports.Genres || (exports.Genres = {}));
var Status;
(function (Status) {
    Status["CURRENT"] = "CURRENT";
    Status["PLANNING"] = "PLANNING";
    Status["COMPLETED"] = "COMPLETED";
    Status["DROPPED"] = "DROPPED";
    Status["PAUSED"] = "PAUSED";
    Status["REPEATING"] = "REPEATING";
})(Status = exports.Status || (exports.Status = {}));
;
//# sourceMappingURL=AniList.js.map