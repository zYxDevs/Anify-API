"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// https://api.animethemes.moe/image?filter[facet]=Grill&sort=random&page[size]=1
const cheerio_1 = require("cheerio");
const API_1 = require("../API");
const Provider_1 = require("../Provider");
class AnimeThemes extends Provider_1.default {
    constructor() {
        super("https://animethemes.moe", API_1.ProviderType.ANIME);
        this.graphql = "https://animethemes.moe/api/graphql";
        this.api = "https://api.animethemes.moe";
    }
    async search(query) {
        // https://api.animethemes.moe/search?page%5Blimit%5D=4&fields%5Bsearch%5D=anime%2Canimethemes%2Cartists%2Cseries%2Cstudios&q=kubo+won%27t+let+me+be+invisible&include%5Banime%5D=animethemes.animethemeentries.videos%2Canimethemes.song%2Cimages&include%5Banimetheme%5D=animethemeentries.videos%2Canime.images%2Csong.artists&include%5Bartist%5D=images%2Csongs&fields%5Banime%5D=name%2Cslug%2Cyear%2Cseason&fields%5Banimetheme%5D=type%2Csequence%2Cslug%2Cgroup%2Cid&fields%5Banimethemeentry%5D=version%2Cepisodes%2Cspoiler%2Cnsfw&fields%5Bvideo%5D=tags%2Cresolution%2Cnc%2Csubbed%2Clyrics%2Cuncen%2Csource%2Coverlap&fields%5Bimage%5D=facet%2Clink&fields%5Bsong%5D=title&fields%5Bartist%5D=name%2Cslug%2Cas&fields%5Bseries%5D=name%2Cslug&fields%5Bstudio%5D=name%2Cslug
        const req = await this.fetch(`${this.api}/search?page%5Blimit%5D=4&fields%5Bsearch%5D=anime%2Canimethemes%2Cartists%2Cseries%2Cstudios&q=${encodeURIComponent(query)}&include%5Banime%5D=animethemes.animethemeentries.videos%2Canimethemes.song%2Cimages&include%5Banimetheme%5D=animethemeentries.videos%2Canime.images%2Csong.artists&include%5Bartist%5D=images%2Csongs&fields%5Banime%5D=name%2Cslug%2Cyear%2Cseason&fields%5Banimetheme%5D=type%2Csequence%2Cslug%2Cgroup%2Cid&fields%5Banimethemeentry%5D=version%2Cepisodes%2Cspoiler%2Cnsfw&fields%5Bvideo%5D=tags%2Cresolution%2Cnc%2Csubbed%2Clyrics%2Cuncen%2Csource%2Coverlap&fields%5Bimage%5D=facet%2Clink&fields%5Bsong%5D=title&fields%5Bartist%5D=name%2Cslug%2Cas&fields%5Bseries%5D=name%2Cslug&fields%5Bstudio%5D=name%2Cslug`);
        const data = req.json();
        const results = [];
        data.search.anime.map((element, index) => {
            results.push({
                title: element.name,
                url: `${this.baseURL}/anime/${element.slug}`,
            });
        });
        return results;
    }
    async getThemes(id) {
        const req = await this.fetch(`${this.baseURL}${id}`);
        const $ = (0, cheerio_1.load)(req.text());
        const props = JSON.parse($("#__NEXT_DATA__").html()).props.pageProps;
        const themes = props.anime.themes;
        // Can access themes via `${this.baseURL}/anime/${slug}/${OP/ED/ED1/etc.}`
        // And also the file via "https://v.animethemes.moe/${filename}.webm"
        return themes;
    }
    async getArtist(query) {
        const req = await this.fetch(`${this.api}/artist?page%5Bsize%5D=15&page%5Bnumber%5D=1&q=${encodeURIComponent(query)}&include=images`);
        const data = req.json();
        return data;
    }
    // Fetches pfp images
    async getImage() {
        const req = await this.fetch(`${this.api}/image?filter[facet]=Grill&sort=random&page[size]=1`);
        const data = req.json();
        return data;
    }
    async getRecentlyAdded() {
        const req = await this.fetch(`${this.graphql}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                Referer: this.baseURL
            },
            body: JSON.stringify({
                operationName: "RecentlyAdded",
                variables: {},
                query: `fragment SongTitleSong on Song {\n  title\n  __typename\n}\n\nfragment PerformancesSong on Song {\n  performances {\n    as\n    artist {\n      slug\n      name\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment SongTitleWithArtistsSong on Song {\n  ...SongTitleSong\n  ...PerformancesSong\n  __typename\n}\n\nfragment extractImagesResourceWithImages on ResourceWithImages {\n  images {\n    link\n    facet\n    __typename\n  }\n  __typename\n}\n\nfragment createVideoSlugTheme on Theme {\n  slug\n  __typename\n}\n\nfragment createVideoSlugEntry on Entry {\n  version\n  __typename\n}\n\nfragment createVideoSlugVideo on Video {\n  tags\n  __typename\n}\n\nfragment ThemeMenuTheme on Theme {\n  id\n  song {\n    title\n    __typename\n  }\n  __typename\n}\n\nfragment ThemeSummaryCardTheme on Theme {\n  ...createVideoSlugTheme\n  ...ThemeMenuTheme\n  slug\n  type\n  sequence\n  group\n  anime {\n    ...extractImagesResourceWithImages\n    slug\n    name\n    __typename\n  }\n  song {\n    ...SongTitleWithArtistsSong\n    __typename\n  }\n  entries {\n    ...createVideoSlugEntry\n    videos {\n      ...createVideoSlugVideo\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nquery RecentlyAdded {\n  recentlyAdded: themeAll(\n    orderBy: \"id\"\n    orderDesc: true\n    limit: 10\n    has: \"animethemeentries.videos,song\"\n  ) {\n    ...ThemeSummaryCardTheme\n    __typename\n  }\n}\n`
            })
        });
        const data = req.json();
        return data;
    }
}
exports.default = AnimeThemes;
//# sourceMappingURL=AnimeThemes.js.map