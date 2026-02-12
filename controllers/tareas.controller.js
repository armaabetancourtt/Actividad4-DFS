const Tarea = require('../models/Tareas');

const obtenerTareas = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const nombreUsuario = req.usuario.usuario;

        const tareas = await Tarea.find({
            $or: [
                { usuarioId: usuarioId },
                { asignadoA: nombreUsuario }
            ]
        }).sort({ _id: -1 });

        res.json(tareas);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener tareas', message: err.message });
    }
};

const crearTarea = async (req, res) => {
    try {
        const nuevaTarea = new Tarea({
            ...req.body,
            usuarioId: req.usuario.id,
            creadaPor: req.usuario.usuario
        });

        const tareaGuardada = await nuevaTarea.save();
        res.status(201).json(tareaGuardada);
    } catch (err) {
        res.status(500).json({ error: 'Error al crear la tarea', message: err.message });
    }
};

const actualizarTarea = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = req.usuario.id;
        const nombreUsuario = req.usuario.usuario;

        const tarea = await Tarea.findById(id);
        
        if (!tarea) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }

        const tienePermiso = 
            (tarea.usuarioId && tarea.usuarioId.toString() === usuarioId) || 
            (tarea.asignadoA === nombreUsuario);

        if (!tienePermiso) {
            return res.status(403).json({ error: 'No tienes permisos para editar esta tarea' });
        }

        const tareaActualizada = await Tarea.findByIdAndUpdate(
            id, 
            { $set: req.body }, 
            { new: true }
        );

        res.json(tareaActualizada);
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar', message: err.message });
    }
};

const eliminarTarea = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = req.usuario.id;
        const nombreUsuario = req.usuario.usuario;

        const tarea = await Tarea.findById(id);

        if (!tarea) {
            return res.status(404).json({ error: 'La tarea no existe' });
        }

        const puedeEliminar = 
            (tarea.usuarioId && tarea.usuarioId.toString() === usuarioId) || 
            (tarea.asignadoA === nombreUsuario);

        if (!puedeEliminar) {
            return res.status(403).json({ error: 'Acceso denegado para eliminar' });
        }

        await Tarea.findByIdAndDelete(id);
        res.json({ mensaje: 'Tarea eliminada correctamente' });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar', message: err.message });
    }
};

module.exports = {
    obtenerTareas,
    crearTarea,
    actualizarTarea,
    eliminarTarea
};