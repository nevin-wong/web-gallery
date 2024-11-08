import { sequelize } from "../datasource.js";
import { DataTypes } from "sequelize";
import { Image } from "./image.js";

export const Comment = sequelize.define("Comment", {
  author: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  content: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

Comment.belongsTo(Image, { onDelete: "CASCADE" });
Image.hasMany(Comment);
