const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuarios');

const registrar = async (req, res) => {
    try {
        const { usuario, password } = req.body;

        if (!usuario || !password) {
            return res.status(400).json({ error: 'Datos incompletos' });
        }

        const existe = await Usuario.findOne({ usuario });
        if (existe) {
            return res.status(400).json({ error: 'Usuario ya existe' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await Usuario.create({
            usuario,
            password: passwordHash
        });

        res.status(201).json({ mensaje: 'Registro exitoso' });
    } catch (err) {
        res.status(500).json({ error: 'Error interno', message: err.message });
    }
};

const login = async (req, res) => {
    try {
        const { usuario, password } = req.body;

        const user = await Usuario.findOne({ usuario });
        if (!user) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const token = jwt.sign(
            { id: user._id, usuario: user.usuario },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
        );

        res.json({
            token,
            usuario: user.usuario
        });
    } catch (err) {
        res.status(500).json({ error: 'Error interno', message: err.message });
    }
};

module.exports = {
    registrar,
    login
};
