const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const commentSchema = new Schema({
    article: String,
    content: String,
    date: Date
});

const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;