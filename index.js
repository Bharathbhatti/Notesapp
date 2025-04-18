require("dotenv").config();


const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI);

const User = require("./models/user.model");
const Note = require("./models/note.model");

const express = require("express");
const cors = require("cors");
const app = express();

const jwt = require("jsonwebtoken");
const { authenticateToken } = require("./utilities");

app.use(express.json());

app.use(express.static('dist'));

const allowedOrigins = [process.env.FRONTEND_URL];

app.use(
  cors({
    origin:allowedOrigins || "*",
    credentials: true,
    optionsSuccessStatus: 200, 
  })
);




app.get("/", (req, res) => {
  return res.send("Backend is running!");
});

//create account
app.post("/create-account", async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName) {
    return res
      .status(400)
      .json({ error: true, message: "Full name is required!" });
  }
  if (!email) {
    return res.status(400).json({ error: true, message: "Email is required!" });
  }
  if (!password) {
    return res
      .status(400)
      .json({ error: true, message: "Password is required!" });
  }

  const isUser = await User.findOne({ email: email });
  if (isUser) {
    return res.json({ error: true, message: "User already exists!" });
  }

  const user = new User({
    fullName,
    email,
    password,
  });

  await user.save();

  const accessToken = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "36000m",
  });

  return res.json({
    error: false,
    user,
    message: "User created successfully!",
    accessToken,
  });
});

//Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).json({ error: true, message: "Email is required!" });
  }
  if (!password) {
    return res
      .status(400)
      .json({ error: true, message: "Password is required!" });
  }

  const userInfo = await User.findOne({ email: email });

  if (!userInfo) {
    return res.json({ error: true, message: "User not found!" });
  }

  if (userInfo.password !== password) {
    return res.json({ error: true, message: "Invalid credentials!" });
  }

  if (userInfo.email == email && userInfo.password == password) {
    const user = { user: userInfo };
    const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "36000m",
    });

    return res.json({
      error: false,
      email,
      message: "Login successful!",
      accessToken,
    });
  } else {
    return res
      .status(400)
      .json({ error: true, message: "Invalid credentials!" });
  }
});

//Get User
app.get("/get-user", authenticateToken, async (req, res) => {
  const { user } = req.user;

  const isUser = await User.findOne({ _id: user._id });
  if (!isUser) {
    return res.sendStatus(401);
  }

  return res.json({
    user: {
      fullName: isUser.fullName,
      email: isUser.email,
      " _id": isUser._id,
      createdOn: isUser.createdOn,
    },
    message: "",
  });
});

//Add Note
app.post("/add-note", authenticateToken, async (req, res) => {
  const { title, content, tags } = req.body;
  const { user } = req.user;

  if (!title) {
    return res.status(400).json({ error: true, message: "Title is required!" });
  }
  if (!content) {
    return res
      .status(400)
      .json({ error: true, message: "Content is required!" });
  }

  try {
    const note = new Note({
      title,
      content,
      tags: tags || [],
      userId: user._id,
    });
    await note.save();
    return res.json({
      error: false,
      message: "Note added successfully!",
      note,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: true, message: "Internal server error!" });
  }
});

//Edit Note
app.put("/edit-note/:noteid", authenticateToken, async (req, res) => {
  const noteid = req.params.noteid;
  const { title, content, tags, isPinned } = req.body;
  const { user } = req.user;

  if (!title && !content && !tags) {
    return res
      .status(400)
      .json({ error: true, message: "No Changes Provided!" });
  }

  try {
    const note = await Note.findOne({ _id: noteid, userId: user._id });
    if (!note) {
      return res.status(404).json({ error: true, message: "Note not found!" });
    }
    if (title) note.title = title;
    if (content) note.content = content;
    if (tags) note.tags = tags;
    if (isPinned) note.isPinned = isPinned;

    await note.save();

    return res.json({
      error: false,
      message: "Note updated successfully!",
      note,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: true, message: "Internal server error!" });
  }
});

//Get All Notes
app.get("/get-all-notes", authenticateToken, async (req, res) => {
  const { user } = req.user;

  try {
    const notes = await Note.find({ userId: user._id }).sort({ isPinned: -1 });
    return res.json({
      error: false,
      message: "Notes fetched successfully!",
      notes,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: true, message: "Internal server error!" });
  }
});

//Delete Note
app.delete("/delete-note/:noteid", authenticateToken, async (req, res) => {
  const noteid = req.params.noteid;
  const { user } = req.user;

  try {
    const note = await Note.findOne({ _id: noteid, userId: user._id });
    if (!note) {
      return res.status(404).json({ error: true, message: "Note not found!" });
    }
    await note.deleteOne({ _id: noteid, userId: user._id });
    return res.json({
      error: false,
      message: "Note deleted successfully!",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: true, message: "Internal server error!" });
  }
});

//Update isPinned Value
app.put("/update-note-Pinned/:noteid", authenticateToken, async (req, res) => {
  const noteid = req.params.noteid;
  const { isPinned } = req.body;
  const { user } = req.user;

  try {
    const note = await Note.findOne({ _id: noteid, userId: user._id });
    if (!note) {
      return res.status(404).json({ error: true, message: "Note not found!" });
    }
    note.isPinned = isPinned;

    await note.save();

    return res.json({
      error: false,
      message: "Note updated successfully!",
      note,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: true, message: "Internal server error!" });
  }
});

//Search Notes
app.get("/search-notes", authenticateToken, async (req, res) => {
  const { user } = req.user;
  const { query } = req.query;

  if(!query) {
    return res.status(400).json({ error: true, message: "Search Query is required!" });
  }

  try {
    const matchingNotes = await Note.find({
      userId: user._id,
      $or: [
        { title: { $regex:new RegExp(query,"i") } },
        { content: { $regex: new RegExp(query,"i") } },
      ],
    });
    return res.json({
      error: false,
      message: "Notes fetched successfully!",
      notes:matchingNotes,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: true, message: "Internal server error!" });
  }
});

app.listen(8000);

module.exports = app;
