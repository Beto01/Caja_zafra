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
// CAMBIO: Nuevos selectores para el modo edición
const formTitle = document.getElementById('form-title');
const editIdInput = document.getElementById('edit-id');
const submitButton = transactionForm.querySelector('button');


/**
 * Función para obtener todos los movimientos de la base de datos.
 */
async function getMovimientos() {
    const { data, error } = await supabase
        .from('movimientos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error al obtener movimientos:', JSON.stringify(error, null, 2));
        return;
    }
    renderMovimientos(data);
}

/**
 * Función para renderizar los movimientos en la tabla y calcular los totales.
 */
function renderMovimientos(movimientos) {
    transactionsTbody.innerHTML = '';
    let totalIngresos = 0;
    let totalGastos = 0;

    movimientos.forEach(mov => {
        const tr = document.createElement('tr');
        const fechaFormateada = new Date(mov.created_at).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        // CAMBIO: Añadido el botón de "Editar"
        tr.innerHTML = `
            <td>${mov.tipo === 'ingreso' ? '🟢' : '🔴'} ${mov.tipo}</td>
            <td>${mov.descripcion}</td>
            <td>${mov.cantidad.toFixed(2)} €</td>
            <td>${fechaFormateada}</td>
            <td>
                <button class="edit-btn" data-id="${mov.id}">Editar</button>
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
 * Función que maneja el envío del formulario, ya sea para crear o para actualizar.
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    const id = editIdInput.value;
    const movimientoData = {
        tipo: document.getElementById('type').value,
        descripcion: document.getElementById('description').value,
        cantidad: parseFloat(document.getElementById('cantidad').value)
    };

    let error;
    if (id) {
        // --- MODO EDICIÓN ---
        console.log(`Actualizando movimiento ID: ${id}`);
        const { error: updateError } = await supabase
            .from('movimientos')
            .update(movimientoData)
            .eq('id', id);
        error = updateError;
    } else {
        // --- MODO CREACIÓN ---
        console.log('Añadiendo nuevo movimiento:', movimientoData);
        const { error: insertError } = await supabase
            .from('movimientos')
            .insert([movimientoData]);
        error = insertError;
    }

    if (error) {
        console.error('Error al guardar el movimiento:', JSON.stringify(error, null, 2));
    } else {
        console.log('Movimiento guardado con éxito');
        resetForm();
        getMovimientos();
    }
}

/**
 * Prepara el formulario para editar un movimiento existente.
 */
async function handleEditClick(id) {
    const { data: movimiento, error } = await supabase
        .from('movimientos')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error al obtener el movimiento para editar:', error);
        return;
    }

    // Rellenamos el formulario con los datos del movimiento
    document.getElementById('type').value = movimiento.tipo;
    document.getElementById('description').value = movimiento.descripcion;
    document.getElementById('cantidad').value = movimiento.cantidad;

    // Configuramos el formulario en modo edición
    editIdInput.value = movimiento.id;
    formTitle.textContent = 'Editando Movimiento';
    submitButton.textContent = 'Guardar Cambios';
}

/**
 * Resetea el formulario a su estado inicial para añadir un nuevo movimiento.
 */
function resetForm() {
    transactionForm.reset();
    editIdInput.value = '';
    formTitle.textContent = 'Registrar Movimiento';
    submitButton.textContent = 'Añadir Movimiento';
}

/**
 * Función para borrar un movimiento.
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

// 1. Listener para el envío del formulario (crear o actualizar)
transactionForm.addEventListener('submit', handleFormSubmit);

// 2. Listener en la tabla para los botones de Editar y Borrar
transactionsTbody.addEventListener('click', (event) => {
    const target = event.target;
    const id = target.getAttribute('data-id');

    if (target.classList.contains('edit-btn')) {
        handleEditClick(id);
    } else if (target.classList.contains('delete-btn')) {
        if (confirm('¿Estás seguro de que quieres borrar este movimiento?')) {
            deleteMovimiento(id);
        }
    }
});

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', getMovimientos);
