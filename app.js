// --- CONFIGURACIÓN DE SUPABASE ---
// 1. Pega aquí tu URL y tu clave anónima de Supabase.
const SUPABASE_URL = 'https://oitzyheeakcwpnavdunc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pdHp5aGVlYWtjd3BuYXZkdW5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODkyNjgsImV4cCI6MjA2ODE2NTI2OH0.3iUJg2qNd0yh9EAG13weBAtnct018Qfb-OK2PeMCYWU';

// --- INICIALIZACIÓN DEL CLIENTE ---
// Esta es la forma correcta de inicializar el cliente.
const clienteSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- SELECTORES DEL DOM (VERIFICADOS CON TU HTML) ---
const transactionForm = document.getElementById('transactionForm');
const transactionsTbody = document.getElementById('transactionsTbody');
const totalIngresosSpan = document.getElementById('total-ingresos');
const totalGastosSpan = document.getElementById('total-gastos');
const balanceTotalSpan = document.getElementById('balance-total');

// --- FUNCIONES ---

/**
 * Obtiene los movimientos de Supabase y los muestra en la tabla.
 */
async function getMovimientos() {
    const { data, error } = await clienteSupabase
        .from('movimientos')
        .select('*')
        .order('fecha', { ascending: false });

    if (error) {
        console.error('Error al obtener movimientos:', error);
        alert('Error al cargar los datos. Revisa la consola (F12) para más detalles.');
        return;
    }
    renderMovimientos(data);
}

/**
 * Dibuja los movimientos en la tabla y calcula los totales.
 */
function renderMovimientos(movimientos) {
    transactionsTbody.innerHTML = '';
    let totalIngresos = 0;
    let totalGastos = 0;

    movimientos.forEach(mov => {
        const tr = document.createElement('tr');
        const fechaFormateada = new Date(mov.fecha).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        tr.innerHTML = `
            <td>${mov.tipo === 'ingreso' ? '🟢' : '🔴'} ${mov.tipo}</td>
            <td>${mov.descripcion}</td>
            <td>${mov.monto.toFixed(2)} €</td>
            <td>${fechaFormateada}</td>
            <td>
                <button class="delete-btn" data-id="${mov.id}">Borrar</button>
            </td>
        `;
        transactionsTbody.appendChild(tr);

        if (mov.tipo === 'ingreso') {
            totalIngresos += mov.monto;
        } else {
            totalGastos += mov.monto;
        }
    });

    totalIngresosSpan.textContent = totalIngresos.toFixed(2);
    totalGastosSpan.textContent = totalGastos.toFixed(2);
    balanceTotalSpan.textContent = (totalIngresos - totalGastos).toFixed(2);
}

/**
 * Añade un nuevo movimiento al enviar el formulario.
 */
async function addMovimiento(event) {
    event.preventDefault();

    const tipo = document.getElementById('type').value;
    const descripcion = document.getElementById('description').value;
    const monto = parseFloat(document.getElementById('cantidad').value); 
    
    if (isNaN(monto) || monto <= 0) {
        alert('Por favor, introduce una cantidad válida.');
        return;
    }

    const nuevoMovimiento = {
        tipo: tipo,
        descripcion: descripcion,
        monto: monto,
        fecha: new Date().toISOString()
    };

    const { error } = await clienteSupabase.from('movimientos').insert([nuevoMovimiento]);

    if (error) {
        console.error('Error al añadir movimiento:', error);
        alert('No se pudo añadir el movimiento. Revisa la consola (F12).');
    } else {
        transactionForm.reset();
        getMovimientos();
    }
}

/**
 * Borra un movimiento al hacer clic en el botón.
 */
async function deleteMovimiento(id) {
    const { error } = await clienteSupabase
        .from('movimientos')
        .delete()
        .match({ id: id });

    if (error) {
        console.error('Error al borrar movimiento:', error);
    } else {
        getMovimientos();
    }
}


// --- EVENT LISTENERS ---
transactionForm.addEventListener('submit', addMovimiento);

transactionsTbody.addEventListener('click', (event) => {
    if (event.target.classList.contains('delete-btn')) {
        const id = event.target.getAttribute('data-id');
        if (confirm('¿Estás seguro de que quieres borrar este movimiento?')) {
            deleteMovimiento(id);
        }
    }
});

// --- INICIALIZACIÓN ---
// Carga los datos iniciales cuando el documento está listo.
document.addEventListener('DOMContentLoaded', getMovimientos);
