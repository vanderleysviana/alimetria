// src/ui.js
import { state, MEALS, formatNumber, calcScaled } from './state.js';
import { openAddFoodModal, openRegisterFoodModal } from './modals.js';
import { savePatientToPdfContext } from './pdf.js';
import { saveEditingDiet, saveCurrentSessionAsDiet } from './patients.js';

// Render / UI helpers
export function createMealCard(mealName){
  const card = document.createElement('div'); 
  card.className = 'meal-card';
  const header = document.createElement('div'); header.className='meal-header';
  const title = document.createElement('strong'); title.textContent=mealName;
  const btns = document.createElement('div');
  const addBtn = document.createElement('button'); addBtn.className='btn btn-primary'; addBtn.innerHTML = '<i class="fas fa-plus"></i> Adicionar alimento';
  addBtn.onclick = ()=> openAddFoodModal(mealName);
  btns.appendChild(addBtn);
  header.appendChild(title); header.appendChild(btns);
  const list = document.createElement('div'); list.className='food-list'; list.id = `list-${mealName}`;
  const totals = document.createElement('div'); totals.className='totals'; totals.id=`totals-${mealName}`;
  card.appendChild(header); card.appendChild(list); card.appendChild(totals);
  return card;
}

export function renderMeals(){
  const container = document.getElementById('mealsContainer');
  container.innerHTML='';

  // Determine if we are allowed to edit: allow when either a diet is loaded (editingDiet) or a patient is selected and no diet is being edited.
  const canEdit = !!state.editingDiet || (!!state.patient && !!state.patient.id);

  if(!canEdit){
    const empty = document.createElement('div');
    empty.style.padding='24px';
    empty.style.textAlign='center';
    empty.style.color='var(--text-light)';
    empty.style.fontSize='15px';
    empty.innerHTML = `
      <i class="fas fa-utensils" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
      <div>Selecione um paciente e uma dieta para começar.</div>
    `;
    container.appendChild(empty);
    // hide FAB if present
    const fab = document.getElementById('saveDietFloating'); 
    if(fab) fab.classList.add('hidden');
    return;
  }

  // show header info inside page for clarity when editing
  const headerInfo = document.createElement('div');
  headerInfo.style.display='flex';
  headerInfo.style.justifyContent='space-between';
  headerInfo.style.alignItems='center';
  headerInfo.style.marginBottom='24px';
  headerInfo.style.padding='16px';
  headerInfo.style.background='var(--primary-light)';
  headerInfo.style.borderRadius='var(--radius)';
  const left = document.createElement('div');
  left.innerHTML = `<strong style="color:var(--primary-dark); font-size: 16px;">${state.patient?.nome || 'Paciente'}</strong><div style="font-size:12px;color:var(--text-light)">${state.editingDiet ? `Editando: ${state.editingDiet.dietName||''}` : state.patient?.objetivo||''}</div>`;
  headerInfo.appendChild(left);
  const right = document.createElement('div'); right.className='controls';
  headerInfo.appendChild(right);
  container.appendChild(headerInfo);

  MEALS.forEach(m=>{
    const card = createMealCard(m);
    container.appendChild(card);
    renderMealList(m);
  });
  renderSummary();
}

export function renderMealList(mealName){
  const list = document.getElementById(`list-${mealName}`);
  list.innerHTML=''; 
  const foods = state.meals[mealName] || [];
  foods.forEach(item=>{
    const food = state.taco[item.id] || { name: 'Desconhecido', calorias:0, proteina:0, carboidrato:0, lipidio:0, fibra:0 };
    const row = document.createElement('div'); row.className='food-item';
    const left = document.createElement('div'); 
    left.innerHTML = `<div style="font-weight:600;color:var(--text)">${food.name}</div><div style="font-size:12px;color:var(--text-light)">${item.qty} g</div>`;
    const right = document.createElement('div'); 
    right.style.display='flex'; 
    right.style.gap='8px'; 
    right.style.alignItems='center';
    const nutrDiv = document.createElement('div'); 
    nutrDiv.style.fontSize='12px'; 
    nutrDiv.style.color='var(--text)';
    nutrDiv.innerHTML = `Kcal ${formatNumber(calcScaled(food.calorias, item.qty),0)} • P ${formatNumber(calcScaled(food.proteina, item.qty))}g • C ${formatNumber(calcScaled(food.carboidrato, item.qty))}g • L ${formatNumber(calcScaled(food.lipidio, item.qty))}g`;
    const del = document.createElement('button'); 
    del.className='btn btn-danger'; 
    del.innerHTML = '<i class="fas fa-trash"></i>';
    del.style.padding = '8px 12px';
    del.onclick = ()=>{ 
      state.meals[mealName]=state.meals[mealName].filter(i=>i!==item); 
      state.unsavedChanges = true; 
      renderMealList(mealName); 
      renderSummary(); 
    };
    right.appendChild(nutrDiv); 
    right.appendChild(del);
    row.appendChild(left); 
    row.appendChild(right);
    list.appendChild(row);
  });
  
  const totalsEl = document.getElementById(`totals-${mealName}`);
  totalsEl.innerHTML=''; 
  const sum = aggregateMeal(mealName);
  totalsEl.innerHTML = `<div style="font-weight:600;color:var(--primary); margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border)">Totais: Kcal ${formatNumber(sum.calorias,0)} • P ${formatNumber(sum.proteina)}g • C ${formatNumber(sum.carboidrato)}g • L ${formatNumber(sum.lipidio)}g • Fib ${formatNumber(sum.fibra)}g</div>`;
}

export function aggregateMeal(mealName){
  const foods = state.meals[mealName] || [];
  const total = {calorias:0,proteina:0,carboidrato:0,lipidio:0,fibra:0};
  foods.forEach(item=>{
    const f = state.taco[item.id] || {};
    total.calorias += calcScaled(f.calorias||0, item.qty);
    total.proteina += calcScaled(f.proteina||0, item.qty);
    total.carboidrato += calcScaled(f.carboidrato||0, item.qty);
    total.lipidio += calcScaled(f.lipidio||0, item.qty);
    total.fibra += calcScaled(f.fibra||0, item.qty || 0);
    Object.keys(f).forEach(k=>{
      if(!['id','name','calorias','proteina','carboidrato','lipidio','fibra'].includes(k)){
        if(typeof f[k] === 'number'){
          total[k] = (total[k] || 0) + calcScaled(f[k], item.qty);
        }
      }
    });
  });
  return total;
}

export function aggregateAll(){
  const total = {calorias:0,proteina:0,carboidrato:0,lipidio:0,fibra:0};
  MEALS.forEach(m=>{
    const t = aggregateMeal(m);
    Object.keys(t).forEach(k=> total[k] = (total[k]||0) + t[k]);
  });
  return total;
}

export function renderSummary(){
  const details = document.getElementById('summaryDetails');
  const sum = aggregateAll();
  details.innerHTML = `
    <div class="summary-item">
      <div class="summary-label">Calorias</div>
      <div class="summary-value">${formatNumber(sum.calorias,0)} kcal</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Proteínas</div>
      <div class="summary-value">${formatNumber(sum.proteina)} g</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Carboidratos</div>
      <div class="summary-value">${formatNumber(sum.carboidrato)} g</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Lipídios</div>
      <div class="summary-value">${formatNumber(sum.lipidio)} g</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Fibras</div>
      <div class="summary-value">${formatNumber(sum.fibra)} g</div>
    </div>
  `;

  // floating Save Diet button (visible only when editingDiet is set)
  let floating = document.getElementById('saveDietFloating');
  if(!floating){
    floating = document.createElement('button');
    floating.id = 'saveDietFloating';
    floating.innerHTML = '<i class="fas fa-save"></i>';
    floating.className = 'fab';
    floating.onclick = ()=> saveEditingDiet();
    document.body.appendChild(floating);
  }
  if(state.editingDiet){
    floating.classList.remove('hidden');
  }else{
    floating.classList.add('hidden');
  }

  // save session button (when a patient is selected and not editing an existing diet)
  const controls = document.querySelector('.summary .controls');
  if(controls){
    let saveSessionMain = document.getElementById('saveSessionMainBtn');
    if(!saveSessionMain){
      saveSessionMain = document.createElement('button');
      saveSessionMain.id = 'saveSessionMainBtn';
      saveSessionMain.className = 'btn btn-success';
      saveSessionMain.innerHTML = '<i class="fas fa-save"></i> Salvar Sessão como Dieta';
      saveSessionMain.onclick = ()=>{
        if(!state.patient || !state.patient.id){
          alert('Selecione primeiro um paciente para salvar a sessão como dieta.');
          return;
        }
        saveCurrentSessionAsDiet(state.patient.id);
        renderSummary();
      };
      controls.insertBefore(saveSessionMain, controls.firstChild);
    }
    if(state.patient && state.patient.id && !state.editingDiet){
      saveSessionMain.classList.remove('hidden');
    }else{
      saveSessionMain.classList.add('hidden');
    }
  }

  const alerts = document.getElementById('alerts'); 
  alerts.innerHTML=''; 
  if(sum.proteina < 50) addAlert('Baixa ingestão de proteínas.');
  if(sum.carboidrato > 350) addAlert('Excesso de carboidratos.');
  if(sum.calorias > 3000) addAlert('Calorias acima do recomendado.');
  if(sum.fibra < 25) addAlert('Fibras insuficientes.');
  MEALS.forEach(m=>{
    if((state.meals[m] || []).length===0) addAlert(`Refeição vazia: ${m}`);
  });
  
  function addAlert(text){
    const a = document.createElement('div'); 
    a.className='alert';
    a.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${text}`;
    alerts.appendChild(a);
  }
}

// wire some global buttons and initial render
document.addEventListener('DOMContentLoaded', ()=>{
  const exportBtn = document.getElementById('exportPdfBtn');
  if(exportBtn) exportBtn.addEventListener('click', savePatientToPdfContext);
  const clearBtn = document.getElementById('clearBtn');
  if(clearBtn) clearBtn.addEventListener('click', ()=>{
    if(!confirm('Limpar todas as refeições?')) return;
    MEALS.forEach(m=> state.meals[m]=[]);
    state.unsavedChanges = true;
    renderMeals();
  });

  // state header updater (keeps header consistent)
  setInterval(()=>{
    const patientDisplay = document.getElementById('patientDisplay');
    if(!patientDisplay) return;
    
    const current = state.patient && state.patient.nome ? state.patient : null;
    let patientInfo = '';
    
    if (current) {
      patientInfo = `
        <div style="font-size: 12px; color: var(--text-light);">Paciente</div>
        <div style="font-weight: 600; color: var(--primary);">${current.nome} ${state.unsavedChanges ? '• Alterações não salvas' : ''}</div>
        ${current.idade ? `<div style="font-size: 11px; color: var(--text-light);">${current.idade} anos • ${current.sexo || ''}</div>` : ''}
      `;
    } else {
      patientInfo = `
        <div style="font-size: 12px; color: var(--text-light);">Paciente</div>
        <div style="font-weight: 600; color: var(--primary);">— nenhum paciente selecionado —</div>
      `;
    }
    
    patientDisplay.innerHTML = patientInfo;
  }, 500);

  renderMeals();
});