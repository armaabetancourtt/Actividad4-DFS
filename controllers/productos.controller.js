const Producto = require('../models/Producto');

const productosCtrl = {};

productosCtrl.listar = async (req, res, next) => {
    try {
        const productos = await Producto.find({ usuarioId: req.usuario.id }).sort({ createdAt: -1 });
        res.json(productos);
    } catch (err) {
        next(err);
    }
};

productosCtrl.crear = async (req, res, next) => {
    try {
        const nuevo = await Producto.create({
            ...req.body,
            usuarioId: req.usuario.id
        });
        res.status(201).json(nuevo);
    } catch (err) {
        next(err);
    }
};

productosCtrl.actualizar = async (req, res, next) => {
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
};

productosCtrl.eliminar = async (req, res, next) => {
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
};

module.exports = productosCtrl;