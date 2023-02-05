# Anify-API
JavaScript API server for scraping anime and manga sites.

## Scraping
Anify API scrapes numerous anime and manga sites, from Zoro, to GogoAnime, to AnimePahe, and more. The API is built on top of [AniSync](https://github.com/Eltik/AniSync) to map AniList information to streaming sites, allowing for multiple providers in case one ever goes down. To avoid rate limits, the API also caches data for a set amount of time and retrieves it when necessary.
## Anime
The API supports the following anime sites:
- [x] [Zoro](https://zoro.to)
- [x] [GogoAnime](https://www1.gogoanime.bid/)
- [x] [AnimePahe](https://animepahe.com)
- [x] [AnimeFox](https://animefox.to)
- [x] [Enime](https://enime.moe)

## Manga
The API supports the following manga sites:
- [x] [MangaDex](https://mangadex.org)
- [x] [ComicK](https://comick.app)
- [x] [Mangakakalot](https://mangakakalot.com)

## Using as a Library
Anify API can be used as... well, an API. It is mainly meant to be used as a REST API, but it can also be used as a library. You can install the NPM package like this:
```bash
npm i anify
```
Then import the class in your JavaScript project:
```javascript
// ES6
import Anify from "anify.js"

// CommonJS
const Anify = require("anify.js").default;
```
Please view [this](https://github.com/Eltik/Anify-API/issues/1) for more information. If you need help with development, join our [Discord](https://anify.tv/discord) and view the [#help](https://discord.com/channels/950964096600252507/1071533139631026287) channel.

## Contribution
This API is a work-in-progress, so contribution would be appreciated. If you'd like to contribute, feel free to open a [Pull Request](https://github.com/Eltik/Anify-API/pulls).

# TBD
The README for this project isn't done! Join our [Discord](https://anify.tv/discord) for more information.