const Usuario = require('../models/Usuarios');
const Log = require('../models/Logs');

const obtenerUsuarios = async (req, res) => {
    try {
        const usuarios = await Usuario.find({}, { password: 0 }).sort({ usuario: 1 });
        
        const dataCompleta = await Promise.all(usuarios.map(async (u) => {
            const logs = await Log.find({ usuarioId: u._id }).sort({ inicioSesion: -1 });
            return {
                id: u._id,
                usuario: u.usuario,
                historialLogs: logs.map(l => ({
                    entrada: l.inicioSesion,
                    salida: l.finSesion || 'Sesión activa',
                    duracion: l.duracionSegundos ? `${l.duracionSegundos}s` : 'N/A'
                }))
            };
        }));

        res.json(dataCompleta);
    } catch (err) {
        res.status(500).json({ error: 'Error interno', message: err.message });
    }
};

module.exports = { obtenerUsuarios };