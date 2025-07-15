// --- CONFIGURACIÓN DE SUPABASE ---
const SUPABASE_URL = 'https://oitzyheeakcwpnavdunc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pdHp5aGVlYWtjd3BuYXZkdW5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODkyNjgsImV4cCI6MjA2ODE2NTI2OH0.3iUJg2qNd0yh9EAG13weBAtnct018Qfb-OK2PeMCYWU';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- SELECTORES DEL DOM ---
const transactionForm = document.getElementById('transactionForm');
const transactionsTbody = document.getElementById('transactionsTbody');
const totalIngresosSpan = document.getElementById('total-ingresos');
const totalGastosSpan = document.getElementById('total-gastos');
const balanceTotalSpan = document.getElementById('balance-total');

/**
 * Función para obtener todos los movimientos de la base de datos.
 */
async function getMovimientos() {
    const { data, error } = await supabase
        .from('movimientos')
        .select('*')
        // Ordenamos por 'created_at', la columna de fecha automática de Supabase.
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error al obtener movimientos:', JSON.stringify(error, null, 2));
        return;
    }
    renderMovimientos(data);
}

/**
 * Función para renderizar los movimientos en la tabla y calcular los totales.
 * @param {Array} movimientos - Un array de objetos, cada uno es un movimiento.
 */
function renderMovimientos(movimientos) {
    transactionsTbody.innerHTML = '';
    let totalIngresos = 0;
    let totalGastos = 0;

    movimientos.forEach(mov => {
        const tr = document.createElement('tr');
        // Usamos 'created_at' para mostrar la fecha.
        const fechaFormateada = new Date(mov.created_at).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        tr.innerHTML = `
            <td>${mov.tipo === 'ingreso' ? '🟢' : '🔴'} ${mov.tipo}</td>
            <td>${mov.descripcion}</td>
            <td>${mov.cantidad.toFixed(2)} €</td>
            <td>${fechaFormateada}</td>
            <td>
                <button class="delete-btn" data-id="${mov.id}">Borrar</button>
            </td>
        `;
        transactionsTbody.appendChild(tr);

        if (mov.tipo === 'ingreso') {
            totalIngresos += mov.cantidad;
        } else {
            totalGastos += mov.cantidad;
        }
    });

    totalIngresosSpan.textContent = totalIngresos.toFixed(2);
    totalGastosSpan.textContent = totalGastos.toFixed(2);
    balanceTotalSpan.textContent = (totalIngresos - totalGastos).toFixed(2);
}

/**
 * Función para añadir un nuevo movimiento.
 * @param {Event} event - El evento del formulario.
 */
async function addMovimiento(event) {
    event.preventDefault();

    const tipo = document.getElementById('type').value;
    const descripcion = document.getElementById('description').value;
    const cantidad = parseFloat(document.getElementById('cantidad').value);
    
    // Ya no necesitamos añadir la fecha. Supabase la añade automáticamente
    // en la columna 'created_at'.
    const nuevoMovimiento = {
        tipo: tipo,
        descripcion: descripcion,
        cantidad: cantidad
    };

    console.log('Añadiendo movimiento:', nuevoMovimiento);
    const { data, error } = await supabase.from('movimientos').insert([nuevoMovimiento]).select();

    if (error) {
        console.error('Error al añadir movimiento:', JSON.stringify(error, null, 2));
    } else {
        console.log('Movimiento añadido con éxito:', data);
        transactionForm.reset();
        getMovimientos();
    }
}

/**
 * Función para borrar un movimiento.
 * @param {number} id - El ID del movimiento a borrar.
 */
async function deleteMovimiento(id) {
    const { error } = await supabase
        .from('movimientos')
        .delete()
        .match({ id: id });

    if (error) {
        console.error('Error al borrar movimiento:', JSON.stringify(error, null, 2));
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
document.addEventListener('DOMContentLoaded', getMovimientos);
