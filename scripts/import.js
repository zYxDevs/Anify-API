const Core = require("../built/Core").default;
let aniSync = new Core();
aniSync.import().then(() => {
    // Finished
});