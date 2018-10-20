const express = require("express");
const exphbs = require("express-handlebars");
const bodyParser = require("body-parser");
const request = require("request");
const cheerio = require("cheerio");
const mongodb = require("mongodb");
const mongoose = require("mongoose");
const logger = require("morgan");
const Article = require("./models/Article.js");
const Comment = require("./models/Comment.js");

const results = [];
const newResults = [];
const baseURL = "https://www.thestar.com";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(logger("dev"));

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

mongoose.connect("mongodb://localhost/scrapperdb", { useNewUrlParser: true });

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => console.log("connected to scrapper_db!"));

app.get("/", function (req, res) {
    Article.find({}, function (err, articles) {
            if (err) return handleError(err);
            console.log(articles);
            res.render("index", {articles});
        })
        .catch(err => res.json(err));
});

app.get("/scrape", function (req, res) {
    request(baseURL, function (error, response, body) {
        if (error) throw error;
        const $ = cheerio.load(body);
        $("span.story__headline").each(function (i, element) {
            let title = $(element).text();
            let link = $(element).parent().attr("href");
            results.push({
                title: title,
                link: baseURL + link
            });
        });

        for (let i = 0; i < results.length; i++) {
            Article.find({ title: results[i].title })
                .then(function (result) {
                    if (result.length === 0) {
                        newResults.push({
                            title: title,
                            link: baseURL + link
                        });
                        Article.create(results[i])
                            .then(newEntry => console.log(newEntry))
                            .catch(err => res.json(err));
                    } else {
                        console.log("Duplicate entry!");
                    };
                })
                .catch(err => res.json(err));
        };

        res.json(newResults);
        results.length = 0;
        newResults.length = 0;

    });
});

app.post("/comment", function (req, res) {
    let data = req.body;
    Comment.create({
        article: data.articleID,
        content: data.content,
        date: data.date
    })
    .then(newComment => console.log(newComment))
    .catch(err => res.json(err));
});

app.listen(PORT, () => console.log(`App listening on: localhost:${PORT}`));
