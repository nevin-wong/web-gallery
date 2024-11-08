import express from "express";
import bodyParser from "body-parser";
import { sequelize } from "./datasource.js";
import { Image } from "./models/image.js";
import { Comment } from "./models/comment.js";
import { Op } from "sequelize";
import multer from "multer";
import path from "path";

export const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const upload = multer({ dest: "uploads/" });

app.use(express.static("static"));

const PORT = 3000;
const limit = 10;

try {
  await sequelize.authenticate();
  await sequelize.sync({ alter: { drop: false } });
  console.log("Connection has been established successfully.");
} catch (error) {
  console.error("Unable to connect to the database:", error);
}

app.use(function (req, res, next) {
  console.log("HTTP request", req.method, req.url, req.body);
  next();
});

app.post(
  "/api/images",
  upload.single("picture"),
  async function (req, res, next) {
    if (!req.body.title || !req.body.author) {
      res.status(400).json({ error: "Missing title or author" });
      return;
    }
    const image = await Image.create({
      title: req.body.title,
      author: req.body.author,
      picture: req.file,
    });
    return res.json(image);
  }
);

app.get("/api/images/:id/picture", async (req, res, next) => {
  const image = await Image.findByPk(req.params.id);
  if (!image) {
    res.status(404).json({ error: "Image not found" });
    return;
  }
  if (!image.picture) {
    res.status(404).json({ error: "Image has no picture" });
    return;
  }
  res.setHeader("Content-Type", image.picture.mimetype);
  res.sendFile(image.picture.path, { root: path.resolve() });
});

// Given a timestamp and a direction (prev or next), this endpoint returns the image
// that that was created closest to the given timestamp in the given direction, as well
// as hasNext and hasPrev booleans indicating whether there in an image before or after.
// (Cursor pagination)
// If there is no timestamp, the latest image is returned.
app.get("/api/images", async (req, res, next) => {
  const timestamp = req.query.timestamp;
  const direction = req.query.direction;
  let image;
  if (timestamp && direction) {
    if (direction === "prev") {
      image = await Image.findOne({
        where: {
          createdAt: {
            [Op.lt]: timestamp,
          },
        },
        order: [["createdAt", "DESC"]],
      });
      if (!image) {
        image = await Image.findOne({
          order: [["createdAt", "ASC"]],
        });
      }
    } else if (direction === "next") {
      image = await Image.findOne({
        where: {
          createdAt: {
            [Op.gt]: timestamp,
          },
        },
        order: [["createdAt", "ASC"]],
      });
      if (!image) {
        image = await Image.findOne({
          order: [["createdAt", "DESC"]],
        });
      }
    } else {
      res.status(400).json({ error: "Invalid direction" });
      return;
    }
  } else if (timestamp) {
    res.status(400).json({ error: "Missing direction" });
    return;
  } else {
    image = await Image.findOne({
      order: [["createdAt", "DESC"]],
    });
  }
  if (!image) {
    // 204 No Content
    res.json({ image: null, hasPrev: false, hasNext: false });
    return;
  }
  const hasPrev = await Image.findOne({
    where: {
      createdAt: {
        [Op.lt]: image.createdAt,
      },
    },
  });
  const hasNext = await Image.findOne({
    where: {
      createdAt: {
        [Op.gt]: image.createdAt,
      },
    },
  });
  res.json({
    image,
    hasPrev: !!hasPrev,
    hasNext: !!hasNext,
  });
});

// Get image by id
app.get("/api/images/:id", async (req, res, next) => {
  const image = await Image.findByPk(req.params.id);
  if (!image) {
    res.status(404).json({ error: "Image not found" });
    return;
  }
  const hasPrev = await Image.findOne({
    where: {
      createdAt: {
        [Op.lt]: image.createdAt,
      },
    },
  });
  const hasNext = await Image.findOne({
    where: {
      createdAt: {
        [Op.gt]: image.createdAt,
      },
    },
  });
  return res.json({
    image: image,
    hasPrev: hasPrev !== null,
    hasNext: hasNext !== null,
  });
});

app.delete("/api/images/:id", async (req, res, next) => {
  const image = await Image.findByPk(req.params.id);
  if (!image) {
    res.status(404).json({ error: "Image not found" });
    return;
  }
  await image.destroy();
  return res.json(image);
});

// Add comment to image given image id
app.post("/api/comments/:imageId", async (req, res, next) => {
  if (!req.body.author || !req.body.content) {
    res.status(400).json({ error: "Missing author or content" });
    return;
  }
  const image = await Image.findByPk(req.params.imageId);
  if (!image) {
    res.status(404).json({ error: "Image not found" });
    return;
  }
  const comment = await Comment.create({
    author: req.body.author,
    content: req.body.content,
  });
  comment.setImage(image);
  return res.json(comment);
});

// Delete comment given comment id
app.delete("/api/comments/:commentId", async (req, res, next) => {
  const comment = await Comment.findByPk(req.params.commentId);
  if (!comment) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }
  await comment.destroy();
  return res.json(comment);
});

// Given a timestamp and a direction (prev or next), this endpoint returns the comments
// that were created closest to the given timestamp in the given direction, as well
// as hasNext and hasPrev booleans indicating whether there are more comments before or after,
// and prevTimestamp and nextTimestamp indicating the timestamps of the latest and earliest
// comments returned, to be used as cursors for the next request.
// (Cursor pagination)
// If there is no timestamp, the latest comments are returned.
app.get("/api/comments/:imageId", async (req, res, next) => {
  const imageId = req.params.imageId;
  const timestamp = req.query.timestamp;
  const direction = req.query.direction;
  const image = await Image.findByPk(req.params.imageId);
  if (!image) {
    res.status(404).json({ error: "Image not found" });
    return;
  }
  let comments;
  let prevTimestamp;
  let nextTimestamp;
  if (timestamp && direction) {
    if (direction === "prev") {
      comments = await Comment.findAll({
        where: {
          imageId: imageId,
          createdAt: {
            [Op.lt]: timestamp,
          },
        },
        order: [["createdAt", "DESC"]],
        limit: limit,
      });
      if (comments.length === 0) {
        comments = await Comment.findAll({
          where: {
            imageId: imageId,
          },
          order: [["createdAt", "ASC"]],
          limit: limit,
        });
        comments = comments.reverse();
      }
    } else if (direction === "next") {
      comments = await Comment.findAll({
        where: {
          imageId: imageId,
          createdAt: {
            [Op.gt]: timestamp,
          },
        },
        order: [["createdAt", "ASC"]],
        limit: limit,
      });
      comments = comments.reverse();
      if (comments.length === 0) {
        comments = await Comment.findAll({
          where: {
            imageId: imageId,
          },
          order: [["createdAt", "DESC"]],
          limit: limit,
        });
      }
    } else {
      res.status(400).json({ error: "Invalid direction" });
      return;
    }
  } else if (timestamp) {
    res.status(400).json({ error: "Missing direction" });
    return;
  } else {
    comments = await Comment.findAll({
      where: {
        imageId: imageId,
      },
      order: [["createdAt", "DESC"]],
      limit: limit,
    });
  }
  if (comments.length === 0) {
    res.json({ comments });
    return;
  }

  nextTimestamp = comments[0].createdAt;
  const hasNext = await Comment.findOne({
    where: {
      imageId: imageId,
      createdAt: {
        [Op.gt]: nextTimestamp,
      },
    },
  });

  if (!hasNext) {
    // If we're on the last page, just get all the latest comments
    comments = await Comment.findAll({
      where: {
        imageId: imageId,
      },
      order: [["createdAt", "DESC"]],
      limit: limit,
    });
  }

  prevTimestamp = comments[comments.length - 1].createdAt;
  const hasPrev = await Comment.findOne({
    where: {
      imageId: imageId,
      createdAt: {
        [Op.lt]: prevTimestamp,
      },
    },
  });

  return res.json({
    comments,
    prevTimestamp,
    nextTimestamp,
    hasPrev: !!hasPrev,
    hasNext: !!hasNext,
  });
});

app.listen(PORT, (err) => {
  if (err) console.log(err);
  else console.log("HTTP server on http://localhost:%s", PORT);
});
