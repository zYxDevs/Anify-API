# Anify-API
JavaScript API server for scraping anime and manga sites.

## Installation
Anify-API requires [PostgreSQL](https://www.postgresql.org/) and [Node.js](https://nodejs.org/en/) to run. On MacOS, you can install PostgreSQL via [Homebrew](https://brew.sh/):
```bash
brew install postgresql
```
Then, install the dependencies and start the server:
```bash
npm i
brew services start postgresql
```
To stop the server, run:
```bash
brew services stop postgresql
```

## Configuration
Anify-API uses [dotenv](https://www.npmjs.com/package/dotenv) to load environment variables. You can create a `.env` file in the root directory of the project and configure the database URL to setup PostgreSQL.
```bash
# .env
# The URL is formatted as postgres://{username}:{password}@{host}:{port}/{database_name}
DATABASE_URL="postgres://username:password@localhost:5432/anify"

# Here is an example that I use
DATABASE_URL="postgresql://postgres:password@localhost:3306"
```

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
- [x] [MangaPark](https://v2.mangapark.net)
- [x] [MangaSee](https://mangasee123.com)

## Meta
The API supports the following meta providers:
- [x] [AnimeThemes](https://animethemes.moe)
- [x] [Kitsu](https://kitsu.io)
- [x] [LiveChart](https://www.livechart.me)
- [x] [TMDB](https://www.themoviedb.org)

## Using as a Library
Anify API can be used as a library. It is mainly meant to be used as a REST API, but it has some other uses as well. You can install the NPM package like this:
```bash
npm i anify.js
```
Then import the class in your JavaScript project:
```javascript
// ES6
import Anify from "anify.js"

// CommonJS
const Anify = require("anify.js").default;

// You will likely need to provide a database URL in the options path
// The URL is postgresql://{username}:{password}@{host}:{port}/{database_name}
// database_name can be an optional value as shown below
const anify = new Anify({ database_url: "postgresql://postgres:password@localhost:3306" });

await anify.init(); // You need to call init() to initialize the database

// It is recommended that you cd into /node_modules/anify.js and run npm run build.
```
Please view [this](https://github.com/Eltik/Anify-API/issues/1) for more information. If you need help with development, join our [Discord](https://anify.tv/discord) and view the [#help](https://discord.com/channels/950964096600252507/1071533139631026287) channel.

## Contribution
This API is a work-in-progress, so contribution would be appreciated. If you'd like to contribute, feel free to open a [Pull Request](https://github.com/Eltik/Anify-API/pulls).

# TBD
The README for this project isn't done! Join our [Discord](https://anify.tv/discord) for more information.