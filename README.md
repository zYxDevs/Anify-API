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
- [x] [MangaPark](https://v2.mangapark.net)
- [x] [MangaSee](https://mangasee123.com)

## Meta
The API supports the following meta providers:
- [x] [AnimeThemes](https://animethemes.moe)
- [x] [Kitsu](https://kitsu.io)
- [x] [LiveChart](https://www.livechart.me)
- [x] [TMDB](https://www.themoviedb.org)

## Using as a Library
Anify API can be used as a library. It is mainly meant to be used as a REST API, but it is entirely possible to be used as an NPM package. You can install the NPM package and all dependencies like this:
```bash
npm i anify.js prisma @prisma/client
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
```
You also need [Prisma](https://npmjs.com/package/prisma) and [@prisma/client](https://npmjs.com/package/@prisma/client) to be setup. After installing the NPM packages, create a `prisma` folder in your project and download the copy the `schema.prisma` file into the folder. Your project should look like this:
```bash
├── node_modules
├── prisma
│   └── schema.prisma
├── package.json
└── other_files_here
```
Then, run the following command:
```bash
npx prisma generate
```
Finally, you will need to create a file called `.env` in your project folder. Put `DATABASE_URL="postgresql://postgres:password@localhost:3306"` in the file. You can change the database URL to whatever you want, but make sure to change the `database_url` in the options path to match the URL in the `.env` file.
```bash
# .env
# The URL is formatted as postgres://{username}:{password}@{host}:{port}/{database_name}
DATABASE_URL="postgres://username:password@localhost:5432/anify"

# Here is an example that I use
DATABASE_URL="postgresql://postgres:password@localhost:3306"
```

Anify-API requires [PostgreSQL](https://www.postgresql.org/) to run. On MacOS, you can install PostgreSQL via [Homebrew](https://brew.sh/):
```bash
# Installation
brew install postgresql

# Start the server
brew services start postgresql

# Stop the server
brew services stop postgresql
```
If you don't have MacOS, you can download PostgreSQL and follow the tutorial on their website. If you want to use a GUI, you can use other tools like [Postico](https://eggerapps.at/postico/).

Please view [this](https://github.com/Eltik/Anify-API/issues/1) for more information. If you need help with development, join our [Discord](https://anify.tv/discord) and view the [#help](https://discord.com/channels/950964096600252507/1071533139631026287) channel.

## Contribution
This API is a work-in-progress, so contribution would be appreciated. If you'd like to contribute, feel free to open a [Pull Request](https://github.com/Eltik/Anify-API/pulls).

# TBD
The README for this project isn't done! Join our [Discord](https://anify.tv/discord) for more information.