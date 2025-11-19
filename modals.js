// src/modals.js
import { state } from './state.js';
import { renderMealList, renderMeals } from './ui.js';

// Função simples para gerar IDs únicos (substitui o nanoid)
function generateId() {
  return 'food_' + Math.random().toString(36).substr(2, 9);
}

export function openAddFoodModal(mealName){
  // prevent editing if no patient + diet selected
  if(!state.editingDiet){
    alert('Selecione um paciente e uma dieta para começar.');
    return;
  }
  const modalRoot = document.getElementById('modalRoot');
  modalRoot.innerHTML = '';
  const backdrop = document.createElement('div'); backdrop.className='modal-backdrop';
  const modal = document.createElement('div'); modal.className='modal';
  const title = document.createElement('h3'); title.textContent = `Adicionar alimento — ${mealName}`;
  const fieldSel = document.createElement('div'); fieldSel.className='field';
  const selLabel = document.createElement('label'); selLabel.textContent='Selecionar alimento (TACO)';
  const select = document.createElement('select');
  select.style.padding='8px'; select.style.borderRadius='8px';
  const tacoList = Object.values(state.taco).sort((a,b)=>a.name.localeCompare(b.name));
  const blankOpt = document.createElement('option'); blankOpt.value=''; blankOpt.textContent='-- buscar / selecionar --';
  select.appendChild(blankOpt);
  tacoList.forEach(f=>{ const o=document.createElement('option'); o.value=f.id; o.textContent = f.name; select.appendChild(o); });
  fieldSel.appendChild(selLabel); fieldSel.appendChild(select);
  const fieldQty = document.createElement('div'); fieldQty.className='field';
  const qtyLabel = document.createElement('label'); qtyLabel.textContent='Quantidade (g)';
  const qtyInput = document.createElement('input'); qtyInput.type='number'; qtyInput.value=100; qtyInput.min=1;
  fieldQty.appendChild(qtyLabel); fieldQty.appendChild(qtyInput);
  const notFoundBtn = document.createElement('button'); notFoundBtn.className='btn btn-outline'; notFoundBtn.textContent='Alimento não está na TACO? Cadastrar';
  notFoundBtn.onclick = (e)=>{
    e.preventDefault();
    backdrop.remove();
    openRegisterFoodModal(mealName, qtyInput.value || 100);
  };
  const actions = document.createElement('div'); actions.style.display='flex'; actions.style.justifyContent='flex-end'; actions.style.gap='8px'; actions.style.marginTop='16px';
  const cancel = document.createElement('button'); cancel.className='btn btn-outline'; cancel.textContent='Cancelar';
  cancel.onclick = ()=> backdrop.remove();
  const add = document.createElement('button'); add.className='btn btn-primary'; add.textContent='Adicionar';
  add.onclick = ()=>{
    const id = select.value;
    const qty = Number(qtyInput.value) || 100;
    if(!id){
      alert('Selecione um alimento da TACO ou cadastre um novo.');
      return;
    }
    // prevent duplicate items: merge quantities if id exists
    const existing = state.meals[mealName].find(x=>x.id===id);
    if(existing){
      if(!confirm('Alimento já existe nesta refeição. Deseja somar as quantidades?')) return;
      existing.qty = Number(existing.qty || 0) + qty;
    }else{
      state.meals[mealName].push({id, qty});
    }
    state.unsavedChanges = true;
    backdrop.remove(); 
    renderMealList(mealName);
    renderMeals();
  };
  actions.appendChild(notFoundBtn); actions.appendChild(cancel); actions.appendChild(add);
  modal.appendChild(title); modal.appendChild(fieldSel); modal.appendChild(fieldQty); modal.appendChild(actions);
  backdrop.appendChild(modal); modalRoot.appendChild(backdrop);
  select.addEventListener('focus', ()=> select.size = 6);
  select.addEventListener('blur', ()=> setTimeout(()=>select.size=0,200));
}

export function openRegisterFoodModal(mealName, defaultQty=100){
  const modalRoot = document.getElementById('modalRoot');
  modalRoot.innerHTML = '';
  const backdrop = document.createElement('div'); backdrop.className='modal-backdrop';
  const modal = document.createElement('div'); modal.className='modal';
  const title = document.createElement('h3'); title.textContent = `Cadastrar alimento (não encontrado na TACO)`;
  const makeField = (labelText, id, type='number', defaultVal='')=>{
    const f=document.createElement('div'); f.className='field';
    const l=document.createElement('label'); l.textContent=labelText;
    let inp;
    if(type==='textarea'){ inp=document.createElement('textarea'); inp.rows=2; }
    else { inp=document.createElement('input'); inp.type=type; }
    inp.id=id; inp.value = defaultVal;
    f.appendChild(l); f.appendChild(inp);
    return {el:f,input:inp};
  };
  const fName = makeField('Nome do alimento','nf_name','text','');
  const fQty = makeField('Quantidade padrão (g)','nf_qty','number',defaultQty);
  const fKcal = makeField('Calorias (kcal/100g)','nf_kcal','number',0);
  const fProt = makeField('Proteínas (g/100g)','nf_prot','number',0);
  const fCarb = makeField('Carboidratos (g/100g)','nf_carb','number',0);
  const fLip = makeField('Lipídios (g/100g)','nf_lip','number',0);
  const fFib = makeField('Fibras (g/100g)','nf_fib','number',0);
  const fOther = makeField('Outros nutrientes (json em chave:valor para números)','nf_other','text','{}');
  modal.appendChild(title);
  [fName,fQty,fKcal,fProt,fCarb,fLip,fFib,fOther].forEach(f=>modal.appendChild(f.el));
  const actions = document.createElement('div'); actions.style.display='flex';actions.style.justifyContent='flex-end';actions.style.gap='8px'; actions.style.marginTop='16px';
  const cancel = document.createElement('button'); cancel.className='btn btn-outline'; cancel.textContent='Cancelar';
  cancel.onclick=()=>backdrop.remove();
  const save = document.createElement('button'); save.className='btn btn-primary'; save.textContent='Salvar e adicionar';
  save.onclick=()=>{
    const name = fName.input.value.trim();
    if(!name){ alert('Nome obrigatório'); return; }
    const id = generateId();
    const obj = {
      id,
      name,
      qtd_padrao: Number(fQty.input.value) || 100,
      calorias: Number(fKcal.input.value)||0,
      proteina: Number(fProt.input.value)||0,
      carboidrato: Number(fCarb.input.value)||0,
      lipidio: Number(fLip.input.value)||0,
      fibra: Number(fFib.input.value)||0
    };
    try{
      const parsed = JSON.parse(fOther.input.value || '{}');
      Object.keys(parsed).forEach(k=>{
        const v = Number(parsed[k]);
        if(!Number.isNaN(v)) obj[k]=v;
      });
    }catch(e){
      alert('Erro no campo Outros nutrientes: JSON inválido');
      return;
    }
    state.taco[id]=obj;
    state.meals[mealName].push({id, qty: Number(fQty.input.value)||defaultQty});
    backdrop.remove(); 
    renderMeals();
  };
  actions.appendChild(cancel); actions.appendChild(save);
  modal.appendChild(actions);
  backdrop.appendChild(modal); modalRoot.appendChild(backdrop);
}