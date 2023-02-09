const Anify = require("./built/Anify").default;
const anify = new Anify({ is_sqlite: true });

/*
anify.search("In/Spectre season 2", "ANIME").then((data) => {
    console.log(data[0].id)
    console.log(data[0].data.idMal);
    console.log(data[0].data.title);
    console.log(data[0].data.description);
    console.log(data[0].connectors);
})
*/
anify.get("126529").then((data) => {
    console.log(data);
    console.log(data.id)
    console.log(data.data.idMal);
    console.log(data.data.title);
    console.log(data.data.description);
    console.log(data.connectors);
})