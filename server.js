require('dotenv').config();

const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'audi_secret';

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/audi_tareas')
    .then(() => console.log('MongoDB conectado'))
    .catch(err => console.error('Error MongoDB:', err.message));

const UsuarioSchema = new mongoose.Schema({
    usuario: { type: String, unique: true, required: true },
    password: { type: String, required: true }
}, { timestamps: true });

const TareaSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    descripcion: String,
    categoria: String,
    estado: { type: String, default: 'Sin Iniciar' },
    creadaPor: { type: String, required: true },
    asignadoA: { type: String, required: true },
    fechaCreacion: { type: String },
    fechaLimiteISO: String,
    fechaLimiteTexto: String,
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true }
}, { timestamps: true });

const ProductoSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    img: { type: String, required: true },
    precio: { type: Number, required: true },
    stock: { type: Number, required: true },
    categoria: { type: String, required: true },
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true }
}, { timestamps: true });

const LogSchema = new mongoose.Schema({
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    usuario: { type: String, required: true },
    inicioSesion: { type: Date, default: Date.now },
    finSesion: { type: Date },
    duracionSegundos: { type: Number }
});

TareaSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

ProductoSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

const Usuario = mongoose.model('Usuario', UsuarioSchema);
const Tarea = mongoose.model('Tarea', TareaSchema);
const Producto = mongoose.model('Producto', ProductoSchema);
const Log = mongoose.model('Log', LogSchema);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const verificarSesion = (req, res, next) => {
    const auth = req.headers.authorization;
    const token = auth && auth.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    jwt.verify(token, SECRET_KEY, (err, payload) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.usuario = payload;
        next();
    });
};

const validarTarea = (req, res, next) => {
    const { titulo, asignadoA } = req.body;
    if (!titulo || !asignadoA) {
        return res.status(400).json({ error: 'Datos incompletos' });
    }
    next();
};

const validarProducto = (req, res, next) => {
    const { nombre, img, precio, stock } = req.body;
    if (!nombre || !img || precio === undefined || stock === undefined) {
        return res.status(400).json({ error: 'Datos de producto incompletos' });
    }
    next();
};

app.post('/api/register', async (req, res, next) => {
    try {
        const { usuario, password } = req.body;
        if (!usuario || !password) {
            return res.status(400).json({ error: 'Datos incompletos' });
        }
        const existe = await Usuario.findOne({ usuario });
        if (existe) {
            return res.status(400).json({ error: 'Usuario ya existe' });
        }
        const hash = await bcrypt.hash(password, 10);
        await Usuario.create({ usuario, password: hash });
        res.status(201).json({ mensaje: 'Usuario creado' });
    } catch (err) {
        next(err);
    }
});

app.post('/api/login', async (req, res, next) => {
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

        const nuevoLog = await Log.create({
            usuarioId: user._id,
            usuario: user.usuario,
            inicioSesion: new Date()
        });

        const token = jwt.sign(
            { id: user._id, usuario: user.usuario, logId: nuevoLog._id },
            SECRET_KEY,
            { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
        );
        res.json({ token, usuario: user.usuario });
    } catch (err) {
        next(err);
    }
});

app.post('/api/logout', verificarSesion, async (req, res, next) => {
    try {
        const log = await Log.findById(req.usuario.logId);
        if (log) {
            log.finSesion = new Date();
            log.duracionSegundos = Math.round((log.finSesion - log.inicioSesion) / 1000);
            await log.save();
        }
        res.json({ mensaje: 'Sesión cerrada y log registrado' });
    } catch (err) {
        next(err);
    }
});

app.get('/api/usuarios', verificarSesion, async (req, res, next) => {
    try {
        const usuarios = await Usuario.find({}, { usuario: 1, _id: 1 }).sort({ usuario: 1 });
        
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
        next(err);
    }
});

app.get('/api/tareas', verificarSesion, async (req, res, next) => {
    try {
        const tareas = await Tarea.find({
            $or: [
                { usuarioId: req.usuario.id },
                { asignadoA: req.usuario.usuario }
            ]
        }).sort({ createdAt: -1 });
        res.json(tareas);
    } catch (err) {
        next(err);
    }
});

app.post('/api/tareas', verificarSesion, validarTarea, async (req, res, next) => {
    try {
        const tarea = await Tarea.create({
            ...req.body,
            creadaPor: req.usuario.usuario,
            usuarioId: req.usuario.id
        });
        res.status(201).json(tarea);
    } catch (err) {
        next(err);
    }
});

app.put('/api/tareas/:id', verificarSesion, async (req, res, next) => {
    try {
        const tarea = await Tarea.findById(req.params.id);
        if (!tarea) {
            return res.status(404).json({ error: 'No encontrada' });
        }
        const tienePermiso = tarea.usuarioId.toString() === req.usuario.id || tarea.asignadoA === req.usuario.usuario;
        if (!tienePermiso) {
            return res.status(403).json({ error: 'Sin permiso' });
        }
        Object.assign(tarea, req.body);
        const actualizada = await tarea.save();
        res.json(actualizada);
    } catch (err) {
        next(err);
    }
});

app.delete('/api/tareas/:id', verificarSesion, async (req, res, next) => {
    try {
        const tarea = await Tarea.findById(req.params.id);
        if (!tarea) {
            return res.status(404).json({ error: 'No encontrada' });
        }
        const tienePermiso = tarea.usuarioId.toString() === req.usuario.id || tarea.asignadoA === req.usuario.usuario;
        if (!tienePermiso) {
            return res.status(403).json({ error: 'Sin permiso' });
        }
        await tarea.deleteOne();
        res.json({ mensaje: 'Tarea eliminada' });
    } catch (err) {
        next(err);
    }
});

app.get('/api/productos', verificarSesion, async (req, res, next) => {
    try {
        const productos = await Producto.find({ usuarioId: req.usuario.id }).sort({ createdAt: -1 });
        res.json(productos);
    } catch (err) {
        next(err);
    }
});

app.post('/api/productos', verificarSesion, validarProducto, async (req, res, next) => {
    try {
        const producto = await Producto.create({
            ...req.body,
            usuarioId: req.usuario.id
        });
        res.status(201).json(producto);
    } catch (err) {
        next(err);
    }
});

app.put('/api/productos/:id', verificarSesion, validarProducto, async (req, res, next) => {
    try {
        const producto = await Producto.findOneAndUpdate(
            { _id: req.params.id, usuarioId: req.usuario.id },
            req.body,
            { new: true }
        );
        if (!producto) return res.status(404).json({ error: 'No encontrado' });
        res.json(producto);
    } catch (err) {
        next(err);
    }
});

app.delete('/api/productos/:id', verificarSesion, async (req, res, next) => {
    try {
        const producto = await Producto.findOneAndDelete({ 
            _id: req.params.id, 
            usuarioId: req.usuario.id 
        });
        if (!producto) return res.status(404).json({ error: 'No encontrado' });
        res.json({ mensaje: 'Producto eliminado' });
    } catch (err) {
        next(err);
    }
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({
        error: 'Error interno',
        detalle: err.message
    });
});

app.listen(PORT, () => {
    console.log(`Servidor Audi activo en http://localhost:${PORT}`);
});