const mongoose = require('mongoose')

const labelsSchema = new mongoose.Schema({
    labels: {
        type: String,
        required: false 
    }
})

module.exports = mongoose.model('Labels', labelsSchema)