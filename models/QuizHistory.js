const mongoose = require("mongoose");

const QuizHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  topic: {
    type: String,
    default: "General Academic Quiz"
  },
  difficulty: {
    type: String,
    default: "medium"
  },
  scorePercent: {
    type: Number,
    required: true
  },
  correctCount: {
    type: Number,
    required: true
  },
  incorrectCount: {
    type: Number,
    default: 0
  },
  unattemptedCount: {
    type: Number,
    default: 0
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  timeTakenSeconds: {
    type: Number,
    default: 0
  },
  submissionType: {
    type: String,
    default: "Normal Submit"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("QuizHistory", QuizHistorySchema);
