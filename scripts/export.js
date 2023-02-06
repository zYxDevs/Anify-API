const Core = require("../built/Core").default;
let aniSync = new Core();
aniSync.export().then(() => {
    // Finished
});