export var config = {
    storage: "/Users/eltik/Documents/Coding/Anify-API/storage",
    web_server: {
        use_http: false,
        password: "Corelia63^#", // Encryption/decryption password. Not important (this password is leaked by the way, so don't try to use it for anything lol)
        port: 3060,
        //url: "https://api.anify.tv",
        url: "http://localhost:3060",
        main_url: "http://localhost:3000",
        cors: ["https://anifytv.vercel.app", "https://anify.club", "https://api.anify.club", "https://anify.tv", "https://api.anify.tv", "http://localhost:3000", "http://localhost:3060"]
    },
    mapping: {
        threshold: 0.8,
        comparison_threshold: 0.8,
        wait: 200,
        check_genres: false,
        search_partial: false,
        partial_amount: 1,
        provider: {
            // CrunchyRoll is currently experiencing some issues.
            // It is recommended to disable it for now even if
            // you have a premium account.
            // However, it may work with an insanely high wait limit (5 seconds).
            CrunchyRoll: {
                threshold: 0.95,
                comparison_threshold: 0.95,
                wait: 5000,
                email: "",
                password: "",
                locale: "en-US",
                search_partial: false,
                partial_amount: 1,
                disabled: true
            },
            Zoro: {
                threshold: 0.65,
                comparison_threshold: 0.55,
                wait: 200,
                search_partial: true,
                partial_amount: 0.95,
                disabled: false
            },
            // Gogo only provides romaji titles.
            GogoAnime: {
                threshold: 0.65,
                comparison_threshold: 0.65,
                wait: 200,
                search_partial: true,
                partial_amount: 0.75,
                disabled: false
            },
            // AnimeFox as well. AnimeFox is essentially Zoro but
            // with GogoAnime sources/data.
            AnimeFox: {
                threshold: 0.65,
                comparison_threshold: 0.5,
                wait: 200,
                search_partial: true,
                partial_amount: 0.85,
                disabled: false
            },
            AnimePahe: {
                threshold: 0.6,
                comparison_threshold: 0.65,
                wait: 200,
                search_partial: true,
                partial_amount: 0.75,
                disabled: false
            },
            // Enime is the most accurate since it provides
            // the romaji, english, and native title.
            // However, there is an annoying rate limit that
            // takes into effect after crawling around 70 pages.
            // A high wait limit might be necessary (around 1000ms).
            Enime: {
                threshold: 0.95,
                comparison_threshold: 0.95,
                wait: 500,
                search_partial: false,
                partial_amount: 1,
                disabled: true
            },
            ComicK: {
                threshold: 0.8,
                comparison_threshold: 0.8,
                wait: 200,
                search_partial: false,
                partial_amount: 1,
                disabled: false
            },
            // Relatively accurate.
            MangaDex: {
                threshold: 0.8,
                comparison_threshold: 0.8,
                wait: 200,
                search_partial: false,
                partial_amount: 1,
                disabled: false
            },
            Mangakakalot: {
                threshold: 0.85,
                comparison_threshold: 0.8,
                wait: 200,
                search_partial: false,
                partial_amount: 1,
                disabled: false
            },
            MangaPark: {
                threshold: 0.85,
                comparison_threshold: 0.85,
                wait: 200,
                search_partial: false,
                partial_amount: 1,
                disabled: false
            },
            MangaSee: {
                threshold: 0.85,
                comparison_threshold: 0.85,
                wait: 200,
                search_partial: false,
                partial_amount: 1,
                disabled: false
            },
            TMDB: {
                api_key: "5201b54eb0968700e693a30576d7d4dc",
                threshold: 0.6,
                comparison_threshold: 0.6,
                wait: 350,
                search_partial: false,
                partial_amount: 1,
                disabled: false
            },
            Kitsu: {
                threshold: 0.9,
                comparison_threshold: 0.9,
                wait: 350,
                search_partial: false,
                partial_amount: 1,
                disabled: false
            },
            AniList: {
                SEASON: "WINTER",
                SEASON_YEAR: 2023,
                NEXT_SEASON: "SPRING",
                NEXT_YEAR: 2023,
                oath_id: -1,
                oath_secret: "",
                disabled: false,
                wait: 350
            }
        },
    },
    crawling: {
        database_path: "/Users/eltik/Documents/Coding/Anify-API/db.db",
        debug: true,
        log_file: true,
        data: {
            wait: 1000,
            max_pages: 9999,
            ids_per_page: 20, // How many IDs to crawl through per-page
            //start: 682 // for manga
            start: 0
        }
    },
    anime: {
        // Time in milliseconds before updating the cached data for episodes.
        cache_timeout: 14400000 // This is 4 hours.
    },
    manga: {
        cache_timeout: 86400000 // 24 hours
    },
    novels: {
        isMacOS: true,
        poppler_path: "/opt/homebrew/Cellar/poppler/22.12.0/bin"
    },
};