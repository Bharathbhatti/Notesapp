const mongoose = require("mongoose");
const schema = mongoose.Schema;

const noteSchema = new schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  createdOn: {
    type: Date,
    default: new Date().getTime(),
  },
  userId: {
    type: String,
    required: true,
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  tags: {
    type: [String],
    default: [],
  },
});

module.exports = mongoose.model("Note", noteSchema);