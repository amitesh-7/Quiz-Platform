const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: [true, 'Quiz ID is required']
  },
  questionText: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
    minlength: [5, 'Question must be at least 5 characters'],
    maxlength: [1000, 'Question cannot exceed 1000 characters']
  },
  options: {
    type: [String],
    required: [true, 'Options are required'],
    validate: {
      validator: function(options) {
        return options.length === 4;
      },
      message: 'Question must have exactly 4 options'
    }
  },
  correctOption: {
    type: Number,
    required: [true, 'Correct option is required'],
    min: [0, 'Correct option must be between 0 and 3'],
    max: [3, 'Correct option must be between 0 and 3']
  },
  marks: {
    type: Number,
    required: [true, 'Marks are required'],
    min: [1, 'Marks must be at least 1'],
    max: [10, 'Marks cannot exceed 10'],
    default: 1
  }
}, {
  timestamps: true
});

// Index for faster queries
questionSchema.index({ quizId: 1 });

// Update quiz total marks after saving a question
questionSchema.post('save', async function() {
  const Question = this.constructor;
  const Quiz = mongoose.model('Quiz');
  
  const totalMarks = await Question.aggregate([
    { $match: { quizId: this.quizId } },
    { $group: { _id: null, total: { $sum: '$marks' } } }
  ]);
  
  await Quiz.findByIdAndUpdate(this.quizId, {
    totalMarks: totalMarks[0]?.total || 0
  });
});

// Update quiz total marks after deleting a question
questionSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    const Question = mongoose.model('Question');
    const Quiz = mongoose.model('Quiz');
    
    const totalMarks = await Question.aggregate([
      { $match: { quizId: doc.quizId } },
      { $group: { _id: null, total: { $sum: '$marks' } } }
    ]);
    
    await Quiz.findByIdAndUpdate(doc.quizId, {
      totalMarks: totalMarks[0]?.total || 0
    });
  }
});

module.exports = mongoose.model('Question', questionSchema);
