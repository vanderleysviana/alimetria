// src/state.js
export const MEALS = [
  "Café da manhã", "Lanche da manhã", "Almoço", "Lanche da tarde", "Jantar", "Ceia"
];

export const state = {
  taco: {},
  meals: {},
  patient: {
    id: null,
    user_id: null,
    nome: 'Paciente Exemplo',
    idade: null,
    sexo: '',
    observacoes: ''
  },
  patients: {},
  editingDiet: null,
  unsavedChanges: false,
  currentDiet: null,
  currentUser: null
};

// Initialize meals
MEALS.forEach(m => state.meals[m] = []);

// Load patients from Supabase
export async function loadPatientsFromDB() {
  if (!state.currentUser) {
    console.log('No user logged in');
    return;
  }

  try {
    const { data: patients, error } = await window.supabase
      .from('patients')
      .select('*')
      .eq('user_id', state.currentUser.id);

    if (error) throw error;

    // Load diets for each patient
    for (const patient of patients) {
      const { data: diets, error: dietsError } = await window.supabase
        .from('diets')
        .select('*, meals(*, meal_items(*, foods(*)))')
        .eq('patient_id', patient.id);

      if (dietsError) throw dietsError;

      patient.dietas = diets || [];
      state.patients[patient.id] = patient;
    }
  } catch (e) {
    console.error('Erro ao carregar pacientes:', e);
  }
}

// Função que estava faltando - carrega dietas de um paciente específico
export async function loadPatientDiets(patientId) {
  try {
    const { data: diets, error } = await window.supabase
      .from('diets')
      .select('*, meals(*, meal_items(*, foods(*)))')
      .eq('patient_id', patientId);

    if (error) throw error;

    if (state.patients[patientId]) {
      state.patients[patientId].dietas = diets || [];
    }
    
    return diets;
  } catch (e) {
    console.error('Erro ao carregar dietas do paciente:', e);
    return [];
  }
}

// Load foods from database
export async function loadFoodsFromDB() {
  try {
    const { data: foods, error } = await window.supabase
      .from('foods')
      .select('*');

    if (error) throw error;

    foods.forEach(f => {
      state.taco[f.id] = {
        id: f.id,
        name: f.nome,
        qtd_padrao: f.qtd_padrao || 100,
        calorias: f.calorias || 0,
        proteina: f.proteina || 0,
        lipidio: f.lipidio || 0,
        carboidrato: f.carboidrato || 0,
        fibra: f.fibra_alimentar || 0,
        colesterol: f.colesterol || 0,
        calcio: f.calcio || 0,
        ferro: f.ferro || 0,
        sodio: f.sodio || 0,
        potassio: f.potassio || 0
      };
    });
  } catch (err) {
    console.error('Erro ao carregar alimentos:', err);
  }
}

export function formatNumber(n, digits = 1) {
  return Number.isFinite(n) ? Number(n.toFixed(digits)) : 0;
}

export function calcScaled(nPer100, qty) {
  return (nPer100 * qty) / 100;
}