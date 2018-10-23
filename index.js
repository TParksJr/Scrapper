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
    Article.find({}).sort("-date").exec(function (err, articles) {
            if (err) return handleError(err);
            res.render("index", {articles});
        })
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
            Article.find({title: results[i].title})
                .then(function(result) {
                    if (result.length === 0) {
                        Article.create(results[i])
                            .then(newEntry => console.log(newEntry))
                            .catch(err => res.json(err));
                    } else {
                        console.log("Duplicate entry!");
                    };
                })
                .catch(err => res.json(err));
        };
        res.json(results);
    });
});

app.post("/comment/:id", function (req, res) {
    let data = req.body;
    let id = req.params.id;

    /*Article.findByIdAndUpdate(id, {comments: {
        article: id,
        content: data,
        date: Date.now()
    }}, function(err, updated) {
        if (err) throw err;
    });*/

    Comment.create({
        article: id,
        content: data,
        date: Date.now()
    })
    .then(newComment => console.log(newComment))
    .catch(err => res.json(err));
});

app.put("/save/:id", function (req, res) {
    let id = req.params.id;
    Article.findByIdAndUpdate(id, {saved: true}, function(err, updated) {
        if (err) throw err;
    });
});

app.put("/unsave/:id", function (req, res) {
    let id = req.params.id;
    Article.findByIdAndUpdate(id, {saved: false}, function(err, updated) {
        if (err) throw err;
    });
});

app.get("/saved", function (req, res) {
    Article.find({}, function (err, articles) {
            if (err) return handleError(err);
            res.render("saved", {articles});
        })
        .catch(err => res.json(err));
});

app.listen(PORT, () => console.log(`App listening on: localhost:${PORT}`));
