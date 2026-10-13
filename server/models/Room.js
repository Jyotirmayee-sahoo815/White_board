const mongoose = require("mongoose");

const pointSchema = new mongoose.Schema(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  { _id: false }
);

const strokeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    userId: { type: String, required: true },
    tool: { type: String, enum: ["pen", "eraser"], required: true },
    color: { type: String, required: true },
    lineWidth: { type: Number, required: true },
    points: { type: [pointSchema], default: [] },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    strokes: { type: [strokeSchema], default: [] },
    lastActivity: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Room", roomSchema);
