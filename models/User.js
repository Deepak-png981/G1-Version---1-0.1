const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: String,
    email: String,
    password: String,
    verified: Boolean,
    purpose: {
        type: String,
        enum: ['FAMILY', 'FRIENDS', 'COMMUNITY']
    },
    communitySize: {
        type: String,
        enum: ['Small', 'Medium', 'Large']
    },
    features: {
        type: [String],
        enum: ['Chat', 'Audio', 'Video']
    },
    color: String,
    font: {
        type: String,
        enum: ['Arial', 'Verdana', 'Times New Roman', 'Tahoma']
    },
    design: {
        type: String,
        enum: ['retro', 'minimalist']
    }
});

const User = mongoose.model('User', UserSchema);
module.exports = User;
