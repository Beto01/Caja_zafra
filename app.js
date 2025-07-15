// --- CONFIGURACIÓN DE SUPABASE ---
// 1. Pega aquí tu URL y tu clave anónima de Supabase.
const SUPABASE_URL = 'https://oitzyheeakcwpnavdunc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pdHp5aGVlYWtjd3BuYXZkdW5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODkyNjgsImV4cCI6MjA2ODE2NTI2OH0.3iUJg2qNd0yh9EAG13weBAtnct018Qfb-OK2PeMCYWU';

// 2. Inicializa el cliente de Supabase.
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- SELECTORES DEL DOM ---
// Capturamos los elementos del HTML con los que vamos a interactuar.
const transactionForm = document.getElementById('transactionForm');
const transactionsTbody = document.getElementById('transactionsTbody');
const totalIngresosSpan = document.getElementById('total-ingresos');
const totalGastosSpan = document.getElementById('total-gastos');
const balanceTotalSpan = document.getElementById('balance-total');

// --- FUNCIONES ---

/**
 * Función para obtener todos los movimientos de la base de datos.
 */
async function getMovimientos() {
    // Usamos el cliente de Supabase para hacer una consulta.
    // .from('movimientos') -> seleccionamos la tabla.
    // .select('*') -> pedimos todas las columnas.
    // .order('fecha', { ascending: false }) -> ordenamos por fecha descendente.
    const { data, error } = await supabase
        .from('movimientos')
        .select('*')
        .order('fecha', { ascending: false });

    if (error) {
        console.error('Error al obtener movimientos:', error);
        return;
    }

    // Si todo va bien, llamamos a la función que renderiza los datos en la tabla.
    renderMovimientos(data);
}

/**
 * Función para renderizar los movimientos en la tabla y calcular los totales.
 * @param {Array} movimientos - Un array de objetos, cada uno es un movimiento.
 */
function renderMovimientos(movimientos) {
    // Limpiamos el contenido previo de la tabla para no duplicar datos.
    transactionsTbody.innerHTML = '';

    let totalIngresos = 0;
    let totalGastos = 0;

    movimientos.forEach(mov => {
        // Por cada movimiento, creamos una nueva fila en la tabla.
        const tr = document.createElement('tr');

        // Formateamos la fecha para que sea más legible.
        const fechaFormateada = new Date(mov.fecha).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        // Llenamos la fila con los datos del movimiento.
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

        // Calculamos los totales.
        if (mov.tipo === 'ingreso') {
            totalIngresos += mov.cantidad;
        } else {
            totalGastos += mov.cantidad;
        }
    });

    // Actualizamos los totales en el HTML.
    totalIngresosSpan.textContent = totalIngresos.toFixed(2);
    totalGastosSpan.textContent = totalGastos.toFixed(2);
    balanceTotalSpan.textContent = (totalIngresos - totalGastos).toFixed(2);
}

/**
 * Función para añadir un nuevo movimiento.
 * @param {Event} event - El evento del formulario.
 */
async function addMovimiento(event) {
    event.preventDefault(); // Evita que la página se recargue al enviar el formulario.

    // Obtenemos los valores del formulario.
    const tipo = document.getElementById('type').value;
    const descripcion = document.getElementById('description').value;
    const monto = parseFloat(document.getElementById('cantidad').value);
    
    // Creamos el nuevo objeto para insertar en Supabase.
    const nuevoMovimiento = {
        tipo: tipo,
        descripcion: descripcion,
        cantidad: monto, // <-- 'monto' se renombra a 'cantidad'
        fecha: new Date().toISOString() // Usamos la fecha y hora actual.
    };

    // Usamos el cliente de Supabase para insertar el nuevo registro.
    console.log('Añadiendo movimiento:', nuevoMovimiento);
    const { data, error } = await supabase.from('movimientos').insert([nuevoMovimiento]).select();

    if (error) {
        console.error('Error al añadir movimiento:', error);
    } else {
        // Si se inserta correctamente, limpiamos el formulario y recargamos los datos.
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
    // Usamos el cliente de Supabase para borrar un registro.
    // .match({ id: id }) -> especificamos qué fila borrar.
    const { error } = await supabase
        .from('movimientos')
        .delete()
        .match({ id: id });

    if (error) {
        console.error('Error al borrar movimiento:', error);
    } else {
        // Si se borra correctamente, recargamos la lista de movimientos.
        getMovimientos();
    }
}


// --- EVENT LISTENERS ---

// 1. Escuchamos el evento 'submit' del formulario para añadir movimientos.
transactionForm.addEventListener('submit', addMovimiento);

// 2. Escuchamos clics en el cuerpo de la tabla para detectar si se pulsa un botón de borrar.
// Esto se llama "delegación de eventos" y es más eficiente que añadir un listener a cada botón.
transactionsTbody.addEventListener('click', (event) => {
    if (event.target.classList.contains('delete-btn')) {
        const id = event.target.getAttribute('data-id');
        // Pedimos confirmación antes de borrar.
        if (confirm('¿Estás seguro de que quieres borrar este movimiento?')) {
            deleteMovimiento(id);
        }
    }
});

// --- INICIALIZACIÓN ---
// Al cargar la página, llamamos a getMovimientos() por primera vez para poblar la tabla.
document.addEventListener('DOMContentLoaded', getMovimientos);
