const mongoose = require('mongoose');

const tareaSchema = new mongoose.Schema({
    titulo: { 
        type: String, 
        required: true,
        trim: true 
    },
    descripcion: { 
        type: String, 
        default: '' 
    },
    categoria: { 
        type: String, 
        default: 'General' 
    },
    estado: { 
        type: String, 
        enum: ['Sin Iniciar', 'En Progreso', 'Finalizado'],
        default: 'Sin Iniciar' 
    },
    creadaPor: { 
        type: String, 
        required: true 
    },
    asignadoA: { 
        type: String, 
        required: true 
    },
    fechaCreacion: { 
        type: String 
    },
    fechaLimiteISO: { 
        type: String 
    },
    fechaLimiteTexto: { 
        type: String 
    },
    usuarioId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Usuario',
        required: true 
    }
}, { 
    timestamps: true 
});

tareaSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('Tarea', tareaSchema);