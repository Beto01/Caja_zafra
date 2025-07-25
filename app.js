// --- CONFIGURACIÓN DE SUPABASE ---
const SUPABASE_URL = 'https://oitzyheeakcwpnavdunc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pdHp5aGVlYWtjd3BuYXZkdW5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODkyNjgsImV4cCI6MjA2ODE2NTI2OH0.3iUJg2qNd0yh9EAG13weBAtnct018Qfb-OK2PeMCYWU';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- SELECTORES DEL DOM ---
const mainPage = document.getElementById('main-page');
const summaryPage = document.getElementById('summary-page');

const transactionForm = document.getElementById('transactionForm');
const transactionsTbody = document.getElementById('transactionsTbody');
const totalIngresosSpan = document.getElementById('total-ingresos');
const totalGastosSpan = document.getElementById('total-gastos');
const balanceTotalSpan = document.getElementById('balance-total');
const formTitle = document.getElementById('form-title');
const editIdInput = document.getElementById('edit-id');
const submitButton = transactionForm.querySelector('button');

const showSummaryBtn = document.getElementById('show-summary-btn');
const backToMainBtn = document.getElementById('back-to-main-btn');
const dailySummaryContent = document.getElementById('daily-summary-content');

// --- NAVEGACIÓN ENTRE PÁGINAS ---

function showMainPage() {
    mainPage.classList.remove('hidden');
    summaryPage.classList.add('hidden');
    resetForm();
    getMovimientos();
}

function showSummaryPage() {
    mainPage.classList.add('hidden');
    summaryPage.classList.remove('hidden');
    generateDailySummary();
}

// --- LÓGICA DE LA APLICACIÓN ---

function showError(message) {
    alert(`Error: ${message}`);
}

async function fetchAllMovimientos() {
    return await supabase
        .from('movimientos')
        .select('*')
        .order('created_at', { ascending: false });
}

async function getMovimientos() {
    const { data, error } = await fetchAllMovimientos();

    if (error) {
        console.error('Error al obtener movimientos:', JSON.stringify(error, null, 2));
        showError('No se pudieron cargar los movimientos. Revisa la conexión.');
        return;
    }
    renderMovimientos(data);
}

function renderMovimientos(movimientos) {
    transactionsTbody.innerHTML = '';
    let totalIngresos = 0;
    let totalGastos = 0;
    let lastDate = null;
    let isOdd = true;

    movimientos.forEach(mov => {
        const tr = document.createElement('tr');
        const fecha = new Date(mov.created_at);
        const fechaFormateada = fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        if (lastDate !== fecha.toDateString()) {
            lastDate = fecha.toDateString();
            isOdd = !isOdd;
        }

        tr.classList.add(isOdd ? 'odd-date' : 'even-date');

        tr.innerHTML = `
            <td data-label="Tipo">${mov.tipo === 'ingreso' ? '🟢' : '🔴'} ${mov.tipo}</td>
            <td data-label="Descripción">${mov.descripcion}</td>
            <td data-label="Cantidad">${mov.cantidad.toFixed(2)} €</td>
            <td data-label="Fecha">${fechaFormateada}</td>
            <td data-label="Acciones">
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

async function generateDailySummary() {
    dailySummaryContent.innerHTML = '<h3>Cargando resumen...</h3>';

    const { data: movimientos, error } = await fetchAllMovimientos();

    if (error) {
        dailySummaryContent.innerHTML = '<p style="color: red;">Error al cargar el resumen.</p>';
        console.error('Error en resumen:', error);
        showError('No se pudo generar el resumen diario.');
        return;
    }

    if (movimientos.length === 0) {
        dailySummaryContent.innerHTML = '<p>No hay movimientos para mostrar.</p>';
        return;
    }

    // --- LÓGICA DE CONSOLIDACIÓN DE INGRESOS ---
    const consolidatedMovimientos = [];
    let previousDayIngresos = 0;

    // Agrupar por día para procesar en orden
    const groupedByDay = movimientos.reduce((acc, mov) => {
        const day = new Date(mov.created_at).toISOString().split('T')[0];
        if (!acc[day]) {
            acc[day] = [];
        }
        acc[day].push(mov);
        return acc;
    }, {});

    const sortedDays = Object.keys(groupedByDay).sort();

    for (let i = 0; i < sortedDays.length; i++) {
        const day = sortedDays[i];
        const dayMovimientos = groupedByDay[day];
        let currentDayIngresos = 0;

        // Añadir el ingreso consolidado del día anterior
        if (previousDayIngresos > 0) {
            const consolidatedIngreso = {
                tipo: 'ingreso',
                descripcion: `Ingreso consolidado del día anterior`,
                cantidad: previousDayIngresos,
                created_at: new Date(day).toISOString(),
                consolidated: true // Flag para identificarlo
            };
            consolidatedMovimientos.unshift(consolidatedIngreso);
        }

        // Procesar movimientos del día actual
        dayMovimientos.forEach(mov => {
            consolidatedMovimientos.push(mov);
            if (mov.tipo === 'ingreso') {
                currentDayIngresos += mov.cantidad;
            }
        });

        previousDayIngresos = currentDayIngresos;
    }


    const groupedByDate = consolidatedMovimientos.reduce((acc, mov) => {
        const date = new Date(mov.created_at).toLocaleDateString('es-ES', {
            weekday: 'long', month: 'long', day: 'numeric'
        });
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(mov);
        return acc;
    }, {});

    dailySummaryContent.innerHTML = '';
    let isOdd = true;
    for (const date in groupedByDate) {
        const group = groupedByDate[date];
        let dailyIngresos = 0;
        let dailyGastos = 0;

        const groupContainer = document.createElement('div');
        groupContainer.className = 'daily-summary-group';
        if (isOdd) {
            groupContainer.classList.add('odd-group');
        }
        isOdd = !isOdd;

        let movementsHtml = '<ul class="daily-movements-list">';
        group.forEach(mov => {
            const icon = mov.tipo === 'ingreso' ? '🟢' : '🔴';
            const description = mov.consolidated ? `<strong>${mov.descripcion}</strong>` : mov.descripcion;
            movementsHtml += `<li>${icon} ${description}: <strong>${mov.cantidad.toFixed(2)} €</strong></li>`;

            if (mov.tipo === 'ingreso') {
                dailyIngresos += mov.cantidad;
            } else {
                dailyGastos += mov.cantidad;
            }
        });
        movementsHtml += '</ul>';

        const balance = dailyIngresos - dailyGastos;

        groupContainer.innerHTML = `
            <h3>${date}</h3>
            ${movementsHtml}
            <div class="daily-summary-footer">
                <p>Ingresado: ${dailyIngresos.toFixed(2)} €</p>
                <p>Gastos: ${dailyGastos.toFixed(2)} €</p>
                <p>Balance del día: ${balance.toFixed(2)} €</p>
            </div>
        `;
        dailySummaryContent.appendChild(groupContainer);
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const id = editIdInput.value;
    const movimientoData = {
        tipo: document.getElementById('type').value,
        descripcion: document.getElementById('description').value,
        cantidad: parseFloat(document.getElementById('cantidad').value)
    };

    const { error } = id
        ? await supabase.from('movimientos').update(movimientoData).eq('id', id)
        : await supabase.from('movimientos').insert([movimientoData]);

    if (error) {
        console.error('Error al guardar el movimiento:', JSON.stringify(error, null, 2));
        showError('No se pudo guardar el movimiento.');
    } else {
        resetForm();
        getMovimientos();
    }
}

async function handleEditClick(id) {
    const { data: movimiento, error } = await supabase.from('movimientos').select('*').eq('id', id).single();
    if (error) {
        console.error('Error al obtener el movimiento para editar:', error);
        showError('No se pudo encontrar el movimiento para editar.');
        return;
    }
    document.getElementById('type').value = movimiento.tipo;
    document.getElementById('description').value = movimiento.descripcion;
    document.getElementById('cantidad').value = movimiento.cantidad;
    editIdInput.value = movimiento.id;
    formTitle.textContent = 'Editando Movimiento';
    submitButton.textContent = 'Guardar Cambios';
    window.scrollTo(0, 0);
}

function resetForm() {
    transactionForm.reset();
    editIdInput.value = '';
    formTitle.textContent = 'Registrar Movimiento';
    submitButton.textContent = 'Añadir Movimiento';
    window.scrollTo(0, 0);
}

async function deleteMovimiento(id) {
    const { error } = await supabase.from('movimientos').delete().match({ id: id });
    if (error) {
        console.error('Error al borrar movimiento:', JSON.stringify(error, null, 2));
        showError('No se pudo borrar el movimiento.');
    } else {
        getMovimientos();
    }
}

// --- EVENT LISTENERS ---

showSummaryBtn.addEventListener('click', showSummaryPage);
backToMainBtn.addEventListener('click', showMainPage);

transactionForm.addEventListener('submit', handleFormSubmit);

transactionsTbody.addEventListener('click', (event) => {
    const target = event.target;
    if (target.classList.contains('edit-btn')) {
        handleEditClick(target.getAttribute('data-id'));
    } else if (target.classList.contains('delete-btn')) {
        if (confirm('¿Estás seguro de que quieres borrar este movimiento?')) {
            deleteMovimiento(target.getAttribute('data-id'));
        }
    }
});

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    showMainPage();
});