// src/patientDiets.js
import { state, MEALS } from './state.js';
import { renderMeals, renderSummary } from './ui.js';

export async function openPatientDiets(patientId){
  const patient = state.patients[patientId];
  if(!patient) return;
  const root = document.getElementById('modalRoot'); root.innerHTML=''; 
  const backdrop = document.createElement('div'); backdrop.className='modal-backdrop'; 
  const modal = document.createElement('div'); modal.className='modal modal-large'; 
  const header = document.createElement('div'); header.style.display='flex'; header.style.justifyContent='space-between'; header.style.alignItems='center';
  const title = document.createElement('h3'); title.textContent=`Dietas de ${patient.nome}`; title.style.color='var(--primary)';
  const newDietBtn = document.createElement('button'); newDietBtn.className='btn btn-success'; newDietBtn.innerHTML='<i class="fas fa-plus"></i> Nova Dieta';
  newDietBtn.onclick = async ()=>{ await createNewDietForPatient(patientId); openPatientDiets(patientId); };
  header.appendChild(title); header.appendChild(newDietBtn);
  modal.appendChild(header);

  const list = document.createElement('div'); list.style.maxHeight='360px'; list.style.overflow='auto'; list.style.marginTop='12px';
  (patient.dietas||[]).forEach(d=>{
    const r=document.createElement('div'); r.style.display='flex'; r.style.justifyContent='space-between'; r.style.alignItems='center'; r.style.padding='8px 0'; r.style.borderBottom='1px solid rgba(0,0,0,0.04)';
    const left = document.createElement('div'); left.innerHTML = `<div style="font-weight:600">${d.objetivo || 'Dieta sem nome'} - ${new Date(d.data).toLocaleDateString('pt-BR')}</div><div style="font-size:12px;color:#334155">Criado: ${new Date(d.created_at).toLocaleDateString('pt-BR')} • Refeições: ${d.meals?.length || 0}</div>`;
    const a=document.createElement('div'); a.style.display='flex'; a.style.gap='8px';
    const loadBtn=document.createElement('button'); loadBtn.className='btn btn-primary'; loadBtn.textContent='Carregar';
    loadBtn.onclick = ()=>{ loadDietToSession(patientId, d.id); backdrop.remove(); };
    const editBtn=document.createElement('button'); editBtn.className='btn btn-outline'; editBtn.textContent='Editar';
    editBtn.onclick = ()=>{ editDiet(patientId, d.id); };
    const del=document.createElement('button'); del.className='btn btn-danger'; del.textContent='Excluir';
    del.onclick = async ()=>{ 
      if(confirm('Excluir dieta?')){ 
        const { error } = await window.supabase
          .from('diets')
          .delete()
          .eq('id', d.id);
        
        if (error) {
          alert('Erro ao excluir dieta: ' + error.message);
        } else {
          patient.dietas = patient.dietas.filter(x=>x.id!==d.id);
          openPatientDiets(patientId); 
        }
      } 
    };
    a.appendChild(loadBtn); a.appendChild(editBtn); a.appendChild(del);
    r.appendChild(left); r.appendChild(a); list.appendChild(r);
  });
  modal.appendChild(list);

  const footer=document.createElement('div'); footer.style.display='flex'; footer.style.justifyContent='flex-end'; footer.style.marginTop='12px';
  const close=document.createElement('button'); close.className='btn btn-outline'; close.textContent='Fechar'; close.onclick=()=>backdrop.remove();
  footer.appendChild(close); modal.appendChild(footer);

  backdrop.appendChild(modal); root.appendChild(backdrop);
}

export async function saveEditingDiet(){
  if(!state.editingDiet) { alert('Selecione um paciente e uma dieta para começar.'); return; }
  const { patientId, dietId } = state.editingDiet;
  const patient = state.patients[patientId];
  if(!patient){ alert('Paciente não encontrado.'); state.editingDiet = null; return; }

  // validations
  const hasAny = Object.keys(state.meals).some(m=> (state.meals[m]||[]).length>0 );
  if(!hasAny){ alert('A dieta está vazia. Adicione pelo menos 1 alimento.'); return; }

  // validate quantities and names
  for(const m of MEALS){
    for(const item of (state.meals[m]||[])){
      if(!item.qty || Number(item.qty) <= 0){ alert('Quantidade inválida em algum alimento.'); return; }
    }
  }

  const saveBtn = document.getElementById('saveDietFloating');
  if(saveBtn){ saveBtn.disabled = true; saveBtn.textContent = 'Salvando...'; }

  try {
    // First, ensure the diet exists and get its meals
    const { data: existingMeals, error: mealsError } = await window.supabase
      .from('meals')
      .select('id, nome')
      .eq('diet_id', dietId);
    
    if (mealsError) throw mealsError;

    // Delete existing meal items
    for (const meal of existingMeals) {
      const { error: deleteError } = await window.supabase
        .from('meal_items')
        .delete()
        .eq('meal_id', meal.id);
      
      if (deleteError) throw deleteError;
    }

    // Save new meal items
    for (const mealName of MEALS) {
      const meal = existingMeals.find(m => m.nome === mealName);
      if (!meal) continue;

      const items = state.meals[mealName] || [];
      for (const item of items) {
        const { error: itemError } = await window.supabase
          .from('meal_items')
          .insert([{
            meal_id: meal.id,
            food_id: item.id,
            quantidade_gramas: item.qty
          }]);
        
        if (itemError) throw itemError;
      }
    }

    // Update diet modified date
    const { error: dietError } = await window.supabase
      .from('diets')
      .update({ observacoes: `Modificado em: ${new Date().toLocaleString()}` })
      .eq('id', dietId);
    
    if (dietError) throw dietError;

    state.unsavedChanges = false;
    alert('Dieta salva com sucesso.');
  } catch(err) {
    console.error('ERR_SAVE_001', err);
    const code = 'ERR_SAVE_001';
    if(confirm(`Erro ao salvar. Código: ${code}. Deseja tentar novamente?`)){
      saveEditingDiet();
    }
  } finally {
    if(saveBtn){ saveBtn.disabled = false; saveBtn.textContent = 'Salvar Dieta'; }
    renderSummary();
    renderMeals();
  }
}

export async function createNewDietForPatient(patientId){
  const patient = state.patients[patientId];
  if(!patient) return;
  const objetivo = prompt('Objetivo da nova dieta (obrigatório):');
  if(!objetivo || !objetivo.trim()){ alert('Objetivo da dieta obrigatório'); return; }
  
  try {
    // Create diet
    const { data: diet, error: dietError } = await window.supabase
      .from('diets')
      .insert([{
        patient_id: patientId,
        data: new Date().toISOString().split('T')[0],
        objetivo: objetivo.trim(),
        observacoes: 'Nova dieta criada'
      }])
      .select();
    
    if (dietError) throw dietError;

    // Create meals for this diet
    const mealInserts = MEALS.map(nome => ({
      diet_id: diet[0].id,
      nome: nome
    }));

    const { error: mealsError } = await window.supabase
      .from('meals')
      .insert(mealInserts);
    
    if (mealsError) throw mealsError;

    // Reload patient diets
    const { data: diets, error: reloadError } = await window.supabase
      .from('diets')
      .select('*, meals(*, meal_items(*, foods(*)))')
      .eq('patient_id', patientId);
    
    if (reloadError) throw reloadError;
    
    patient.dietas = diets || [];
    
  } catch (error) {
    alert('Erro ao criar dieta: ' + error.message);
  }
}

export async function editDiet(patientId, dietId){
  const patient = state.patients[patientId];
  if(!patient) return;
  const diet = (patient.dietas||[]).find(d=>d.id===dietId);
  if(!diet) return;
  const newObjetivo = prompt('Alterar objetivo da dieta:', diet.objetivo);
  if(newObjetivo && newObjetivo.trim()){
    try {
      const { error } = await window.supabase
        .from('diets')
        .update({ objetivo: newObjetivo.trim() })
        .eq('id', dietId);
      
      if (error) throw error;
      
      diet.objetivo = newObjetivo.trim();
      openPatientDiets(patientId);
    } catch (error) {
      alert('Erro ao atualizar dieta: ' + error.message);
    }
  }
}

export function loadDietToSession(patientId, dietId){
  const patient = state.patients[patientId];
  if(!patient) return;
  const diet = (patient.dietas||[]).find(d=>d.id===dietId);
  if(!diet) return;

  // Clear current meals
  MEALS.forEach(m => state.meals[m] = []);

  // Load meals from diet
  diet.meals.forEach(meal => {
    const mealName = meal.nome;
    if (MEALS.includes(mealName)) {
      state.meals[mealName] = meal.meal_items.map(item => ({
        id: item.food_id,
        qty: item.quantidade_gramas
      }));
    }
  });

  state.patient = {...patient};
  state.currentDiet = diet;
  
  // reflect patient + diet in header
  const disp = document.getElementById('patientDisplay'); 
  if(disp) disp.textContent = `${patient.nome} — ${diet.objetivo || 'Dieta'}`;
  
  // mark editing state
  state.editingDiet = { patientId, dietId, dietName: diet.objetivo };
  renderMeals(); 
  renderSummary();
  alert(`Dieta "${diet.objetivo}" carregada para montagem e edição.`);
}

export async function saveCurrentSessionAsDiet(patientId){
  const patient = state.patients[patientId];
  if(!patient) return;
  const hasAny = Object.keys(state.meals).some(m=> (state.meals[m]||[]).length>0 );
  if(!hasAny){ alert('Sessão atual vazia — nada para salvar como dieta.'); return; }
  const objetivo = prompt('Objetivo para a nova dieta (obrigatório):');
  if(!objetivo || !objetivo.trim()){ alert('Objetivo da dieta obrigatório'); return; }
  
  try {
    // Create diet
    const { data: diet, error: dietError } = await window.supabase
      .from('diets')
      .insert([{
        patient_id: patientId,
        data: new Date().toISOString().split('T')[0],
        objetivo: objetivo.trim(),
        observacoes: 'Dieta criada da sessão atual'
      }])
      .select();
    
    if (dietError) throw dietError;

    // Create meals and meal items
    for (const mealName of MEALS) {
      const { data: meal, error: mealError } = await window.supabase
        .from('meals')
        .insert([{
          diet_id: diet[0].id,
          nome: mealName
        }])
        .select();
      
      if (mealError) throw mealError;

      const items = state.meals[mealName] || [];
      for (const item of items) {
        const { error: itemError } = await window.supabase
          .from('meal_items')
          .insert([{
            meal_id: meal[0].id,
            food_id: item.id,
            quantidade_gramas: item.qty
          }]);
        
        if (itemError) throw itemError;
      }
    }

    // Reload patient diets
    const { data: diets, error: reloadError } = await window.supabase
      .from('diets')
      .select('*, meals(*, meal_items(*, foods(*)))')
      .eq('patient_id', patientId);
    
    if (reloadError) throw reloadError;
    
    patient.dietas = diets || [];
    
    alert(`Dieta "${objetivo}" salva no paciente ${patient.nome}.`);
  } catch (error) {
    alert('Erro ao salvar dieta: ' + error.message);
  }
}