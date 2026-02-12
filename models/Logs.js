const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    usuario: { type: String, required: true },
    inicioSesion: { type: Date, default: Date.now },
    finSesion: { type: Date },
    duracionSegundos: { type: Number }
});

module.exports = mongoose.model('Log', logSchema);