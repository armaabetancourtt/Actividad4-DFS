class Producto {
    constructor(data) {
        this.id = data.id || data._id;
        this.nombre = data.nombre || "Modelo Audi";
        this.img = data.img || "https://via.placeholder.com/400x250";
        this.precio = data.precio || 0;
        this.stock = data.stock || 0;
        this.categoria = data.categoria || "Gama Alta";
    }
}

class GestorInventario {
    constructor() {
        this.API_URL = 'http://localhost:3000/api/productos';
        this.token = localStorage.getItem('audi_token');
        this.items = [];

        this.grid = document.getElementById('product-grid');
        this.inputNombre = document.getElementById('nombreProd');
        this.inputImg = document.getElementById('imagenProd');
        this.inputPrecio = document.getElementById('precioProd');
        this.inputStock = document.getElementById('stockProd');
        this.selectCat = document.getElementById('categoriaProd');
        this.editId = document.getElementById('edit-id-prod');
        this.btnSave = document.getElementById('btn-save-prod');
        this.btnCancel = document.getElementById('btn-cancel-prod');
        this.errorMsg = document.getElementById('error-msg-prod');

        if (!this.token) {
            window.location.href = '../../index.html';
            return;
        }

        this.init();
    }

    init() {
        this.configurarMenu();
        this.btnSave.onclick = () => this.procesar();
        this.btnCancel.onclick = () => this.limpiarForm();
        this.cargar();
        
        document.getElementById('btn-logout').onclick = (e) => {
            e.preventDefault();
            localStorage.removeItem('audi_token');
            window.location.href = '../../ACT3/pages/login.html';
        };
    }

    configurarMenu() {
        const icon = document.getElementById('menu-icon');
        const menu = document.getElementById('nav-menu');
        const close = document.getElementById('close-icon');
        icon.onclick = () => menu.classList.add('active');
        close.onclick = () => menu.classList.remove('active');
    }

    async cargar() {
        try {
            const res = await fetch(this.API_URL, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await res.json();
            this.items = data.map(p => new Producto(p));
            this.render();
        } catch (err) { console.error(err); }
    }

    async procesar() {
        const id = this.editId.value;
        const body = {
            nombre: this.inputNombre.value.trim(),
            img: this.inputImg.value.trim(),
            precio: parseFloat(this.inputPrecio.value),
            stock: parseInt(this.inputStock.value),
            categoria: this.selectCat.value
        };

        if (!body.nombre || isNaN(body.precio)) {
            this.errorMsg.style.display = "block";
            setTimeout(() => this.errorMsg.style.display = "none", 3000);
            return;
        }

        const url = id ? `${this.API_URL}/${id}` : this.API_URL;
        const method = id ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                this.limpiarForm();
                this.cargar();
            }
        } catch (err) { console.error(err); }
    }

    async eliminar(id) {
        if (!confirm("¿Eliminar producto?")) return;
        try {
            const res = await fetch(`${this.API_URL}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (res.ok) this.cargar();
        } catch (err) { console.error(err); }
    }

    editar(id) {
        const p = this.items.find(i => i.id == id);
        if (!p) return;
        this.editId.value = p.id;
        this.inputNombre.value = p.nombre;
        this.inputImg.value = p.img;
        this.inputPrecio.value = p.precio;
        this.inputStock.value = p.stock;
        this.selectCat.value = p.categoria;
        this.btnSave.innerText = "Actualizar";
        this.btnCancel.style.display = "block";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    limpiarForm() {
        this.editId.value = "";
        this.inputNombre.value = "";
        this.inputImg.value = "";
        this.inputPrecio.value = "";
        this.inputStock.value = "";
        this.btnSave.innerText = "Registrar Vehículo";
        this.btnCancel.style.display = "none";
    }

    render() {
        this.grid.innerHTML = '';
        this.items.forEach(p => {
            const li = document.createElement('li');
            li.className = 'task-card';
            li.innerHTML = `
                <div class="prod-img-box">
                    <img src="${p.img}" onerror="this.src='https://via.placeholder.com/400x250?text=Audi'">
                </div>
                <div class="prod-info">
                    <span class="category-label">${p.categoria}</span>
                    <h3>${p.nombre}</h3>
                    <p class="price-text">$${p.precio.toLocaleString()}</p>
                    <p>Stock: ${p.stock}</p>
                </div>
                <div class="task-actions">
                    <button class="btn-sm edit-btn"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-sm delete-btn"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            const [bE, bD] = li.querySelectorAll('button');
            bE.onclick = () => this.editar(p.id);
            bD.onclick = () => this.eliminar(p.id);
            this.grid.appendChild(li);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => new GestorInventario());