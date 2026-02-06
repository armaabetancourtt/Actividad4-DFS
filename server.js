const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'audi_premium_2026';
const DATA_PATH = path.join(__dirname, 'tareas.json');
const USERS_PATH = path.join(__dirname, 'usuarios.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function initDB() {
    try {
        await fs.access(DATA_PATH).catch(() => fs.writeFile(DATA_PATH, '[]'));
        await fs.access(USERS_PATH).catch(() => fs.writeFile(USERS_PATH, '[]'));
    } catch (err) {
        console.error(err);
    }
}
initDB();

const validarTarea = (req, res, next) => {
    const { titulo, asignadoA } = req.body;
    if (!titulo || !asignadoA) {
        return res.status(400).json({ error: "Título y Responsable son obligatorios" });
    }
    next();
};

const verificarSesion = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "No autorizado" });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: "Token inválido o expirado" });
        req.user = user;
        next();
    });
};

app.post('/api/register', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: "Datos incompletos" });

        const data = await fs.readFile(USERS_PATH, 'utf-8');
        const usuarios = JSON.parse(data || "[]");

        if (usuarios.find(u => u.username === username)) {
            return res.status(400).json({ error: "Usuario ya existe" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        usuarios.push({ id: Date.now(), username, password: hashedPassword });

        await fs.writeFile(USERS_PATH, JSON.stringify(usuarios, null, 2));
        res.status(201).json({ mensaje: "Registro exitoso" });
    } catch (err) { next(err); }
});

app.post('/api/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const data = await fs.readFile(USERS_PATH, 'utf-8');
        const usuarios = JSON.parse(data || "[]");
        const user = usuarios.find(u => u.username === username);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Credenciales incorrectas" });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            SECRET_KEY,
            { expiresIn: '2h' }
        );

        res.json({ token, username: user.username });
    } catch (err) { next(err); }
});

app.get('/api/usuarios', verificarSesion, async (req, res, next) => {
    try {
        const data = await fs.readFile(USERS_PATH, 'utf-8');
        const usuarios = JSON.parse(data || "[]");
        res.json(usuarios.map(u => ({ id: u.id, username: u.username })));
    } catch (err) { next(err); }
});

app.get('/api/tareas', verificarSesion, async (req, res, next) => {
    try {
        const data = await fs.readFile(DATA_PATH, 'utf-8');
        const tareas = JSON.parse(data || "[]");
        res.json(
            tareas.filter(t =>
                t.usuarioId === req.user.id ||
                t.asignadoA === req.user.username
            )
        );
    } catch (err) { next(err); }
});

app.post('/api/tareas', verificarSesion, validarTarea, async (req, res, next) => {
    try {
        const data = await fs.readFile(DATA_PATH, 'utf-8');
        const tareas = JSON.parse(data || "[]");

        const nueva = {
            ...req.body,
            id: Date.now(),
            usuarioId: req.user.id,
            creadaPor: req.user.username
        };

        tareas.push(nueva);
        await fs.writeFile(DATA_PATH, JSON.stringify(tareas, null, 2));
        res.status(201).json(nueva);
    } catch (err) { next(err); }
});

app.put('/api/tareas/:id', verificarSesion, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const data = await fs.readFile(DATA_PATH, 'utf-8');
        const tareas = JSON.parse(data || "[]");

        const idx = tareas.findIndex(t => Number(t.id) === id);
        if (idx === -1) return res.status(404).json({ error: "Tarea no encontrada" });

        if (
            tareas[idx].usuarioId !== req.user.id &&
            tareas[idx].asignadoA !== req.user.username
        ) {
            return res.status(403).json({ error: "Sin permiso" });
        }

        tareas[idx] = { ...tareas[idx], ...req.body };
        await fs.writeFile(DATA_PATH, JSON.stringify(tareas, null, 2));
        res.json(tareas[idx]);
    } catch (err) { next(err); }
});

app.delete('/api/tareas/:id', verificarSesion, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const data = await fs.readFile(DATA_PATH, 'utf-8');
        const tareas = JSON.parse(data || "[]");

        const tarea = tareas.find(t => Number(t.id) === id);
        if (!tarea) return res.status(404).json({ error: "No encontrada" });

        if (
            tarea.usuarioId !== req.user.id &&
            tarea.asignadoA !== req.user.username
        ) {
            return res.status(403).json({ error: "Sin permiso" });
        }

        await fs.writeFile(
            DATA_PATH,
            JSON.stringify(tareas.filter(t => Number(t.id) !== id), null, 2)
        );

        res.json({ mensaje: "Tarea eliminada" });
    } catch (err) { next(err); }
});

app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
    res.status(500).json({ error: "Error interno", message: err.message });
});

app.listen(PORT, () => {
    console.log(`Servidor Audi corriendo en http://localhost:${PORT}`);
});
