// src/patientManager.js - VERSÃO COMPLETA CORRIGIDA
import { state, MEALS, loadPatientsFromDB, loadPatientDiets } from './state.js';
import { renderMeals, renderSummary } from './ui.js';
import { openPatientDiets } from './patients.js';

export function initPatientUI() {
  const disp = document.getElementById('patientDisplay');
  if (!disp) return;
  
  const current = state.patient && state.patient.nome ? state.patient : null;
  const patientInfo = current ? 
    `<div style="font-size: 12px; color: var(--text-light);">Paciente</div>
     <div style="font-weight: 600; color: var(--primary);">${current.nome}</div>
     ${current.idade ? `<div style="font-size: 11px; color: var(--text-light);">${current.idade} anos • ${current.sexo || ''}</div>` : ''}` :
    `<div style="font-size: 12px; color: var(--text-light);">Paciente</div>
     <div style="font-weight: 600; color: var(--primary);">— nenhum paciente selecionado —</div>`;
  
  disp.innerHTML = patientInfo;
}

export async function openPatientManager() {
  console.log('📋 Abrindo gerenciador de pacientes...');
  
  try {
    await loadPatientsFromDB();
    
    const root = document.getElementById('modalRoot');
    if (!root) {
      console.error('❌ modalRoot não encontrado');
      return;
    }
    
    root.innerHTML = '';
    
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    
    const modal = document.createElement('div');
    modal.className = 'modal modal-large';
    
    // Header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    
    const title = document.createElement('h3');
    title.innerHTML = '<i class="fas fa-users"></i> Gerenciar Pacientes';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.onclick = () => backdrop.remove();
    
    modalHeader.appendChild(title);
    modalHeader.appendChild(closeBtn);
    modal.appendChild(modalHeader);

    // Search and New Patient
    const actionsHeader = document.createElement('div');
    actionsHeader.style.display = 'flex';
    actionsHeader.style.gap = '16px';
    actionsHeader.style.marginBottom = '20px';
    actionsHeader.style.alignItems = 'flex-end';
    
    const searchField = document.createElement('div');
    searchField.style.flex = '1';
    
    const searchLabel = document.createElement('label');
    searchLabel.textContent = 'Pesquisar pacientes';
    searchLabel.style.display = 'block';
    searchLabel.style.marginBottom = '8px';
    searchLabel.style.fontWeight = '500';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.placeholder = 'Digite o nome do paciente...';
    searchInput.style.width = '100%';
    searchInput.id = 'patientSearch';
    
    searchField.appendChild(searchLabel);
    searchField.appendChild(searchInput);
    
    const newBtn = document.createElement('button');
    newBtn.className = 'btn btn-success';
    newBtn.innerHTML = '<i class="fas fa-plus"></i> Novo Paciente';
    newBtn.onclick = () => openEditPatientForm();
    
    actionsHeader.appendChild(searchField);
    actionsHeader.appendChild(newBtn);
    modal.appendChild(actionsHeader);

    // Patients List
    const list = document.createElement('div');
    list.style.maxHeight = '400px';
    list.style.overflow = 'auto';
    list.style.border = '1px solid var(--border)';
    list.style.borderRadius = 'var(--radius-sm)';
    list.style.padding = '8px';
    modal.appendChild(list);

    // Render initial list
    renderPatientList('', list);
    
    // Search functionality
    searchInput.addEventListener('input', () => {
      renderPatientList(searchInput.value.trim().toLowerCase(), list);
    });

    backdrop.appendChild(modal);
    root.appendChild(backdrop);
    
    console.log('✅ Gerenciador de pacientes aberto com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao abrir gerenciador de pacientes:', error);
    alert('Erro ao abrir gerenciador de pacientes: ' + error.message);
  }
}

export function renderPatientList(filter, container) {
  container.innerHTML = '';
  const patients = Object.values(state.patients).sort((a, b) => a.nome.localeCompare(b.nome));
  const filtered = patients.filter(p => !filter || p.nome.toLowerCase().includes(filter));
  
  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.style.padding = '40px 20px';
    empty.style.textAlign = 'center';
    empty.style.color = 'var(--text-light)';
    empty.innerHTML = `
      <i class="fas fa-user-slash" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
      <div>Nenhum paciente encontrado</div>
      ${!filter ? '<div style="margin-top: 8px; font-size: 14px;">Clique em "Novo Paciente" para adicionar</div>' : ''}
    `;
    container.appendChild(empty);
    return;
  }
  
  filtered.forEach(p => {
    const patientCard = document.createElement('div');
    patientCard.className = 'card';
    patientCard.style.marginBottom = '12px';
    patientCard.style.padding = '16px';
    
    const patientInfo = document.createElement('div');
    patientInfo.style.display = 'flex';
    patientInfo.style.justifyContent = 'space-between';
    patientInfo.style.alignItems = 'center';
    
    const left = document.createElement('div');
    left.style.flex = '1';
    
    const nameLine = document.createElement('div');
    nameLine.style.fontWeight = '600';
    nameLine.style.fontSize = '16px';
    nameLine.style.color = 'var(--text)';
    nameLine.textContent = p.nome;
    
    const metaLine = document.createElement('div');
    metaLine.style.fontSize = '14px';
    metaLine.style.color = 'var(--text-light)';
    metaLine.style.marginTop = '4px';
    
    const dietCount = (p.dietas && p.dietas.length) ? p.dietas.length : 0;
    const metaItems = [];
    if (p.idade) metaItems.push(`${p.idade} anos`);
    if (p.sexo) metaItems.push(p.sexo);
    metaItems.push(`${dietCount} dieta${dietCount !== 1 ? 's' : ''}`);
    
    metaLine.textContent = metaItems.join(' • ');
    
    left.appendChild(nameLine);
    left.appendChild(metaLine);

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    actions.style.flexWrap = 'wrap';
    
    const manageBtn = document.createElement('button');
    manageBtn.className = 'btn btn-primary';
    manageBtn.innerHTML = '<i class="fas fa-utensils"></i>';
    manageBtn.title = 'Gerenciar Dietas';
    manageBtn.style.padding = '8px 12px';
    manageBtn.onclick = async () => {
      await loadPatientDiets(p.id);
      openPatientDiets(p.id);
    };
    
    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-outline';
    editBtn.innerHTML = '<i class="fas fa-edit"></i>';
    editBtn.title = 'Editar';
    editBtn.style.padding = '8px 12px';
    editBtn.onclick = () => openEditPatientForm(p);
    
    const selectBtn = document.createElement('button');
    selectBtn.className = 'btn btn-success';
    selectBtn.innerHTML = '<i class="fas fa-check"></i>';
    selectBtn.title = 'Selecionar';
    selectBtn.style.padding = '8px 12px';
    selectBtn.onclick = () => {
      selectPatient(p.id);
      backdrop.remove();
    };
    
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger';
    delBtn.innerHTML = '<i class="fas fa-trash"></i>';
    delBtn.title = 'Excluir';
    delBtn.style.padding = '8px 12px';
    delBtn.onclick = async () => {
      if (confirm(`Tem certeza que deseja excluir o paciente "${p.nome}"? Esta ação não pode ser desfeita.`)) {
        await deletePatient(p.id);
        renderPatientList(document.getElementById('patientSearch')?.value.trim().toLowerCase() || '', container);
        initPatientUI();
      }
    };
    
    actions.appendChild(selectBtn);
    actions.appendChild(manageBtn);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    patientInfo.appendChild(left);
    patientInfo.appendChild(actions);
    patientCard.appendChild(patientInfo);
    container.appendChild(patientCard);
  });
}

async function deletePatient(patientId) {
  try {
    const { error } = await window.supabase
      .from('patients')
      .delete()
      .eq('id', patientId);
    
    if (error) throw error;
    
    delete state.patients[patientId];
    
    // If deleted patient was selected, clear selection
    if (state.patient && state.patient.id === patientId) {
      state.patient = {
        id: null,
        user_id: null,
        nome: 'Paciente Exemplo',
        idade: null,
        sexo: '',
        observacoes: ''
      };
    }
    
    console.log(`✅ Paciente ${patientId} excluído`);
    
  } catch (error) {
    console.error('❌ Erro ao excluir paciente:', error);
    alert('Erro ao excluir paciente: ' + error.message);
  }
}

export async function openEditPatientForm(existing) {
  const root = document.getElementById('modalRoot');
  root.innerHTML = '';
  
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  
  const modalHeader = document.createElement('div');
  modalHeader.className = 'modal-header';
  
  const title = document.createElement('h3');
  title.innerHTML = `<i class="fas ${existing ? 'fa-edit' : 'fa-user-plus'}"></i> ${existing ? 'Editar Paciente' : 'Novo Paciente'}`;
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.innerHTML = '<i class="fas fa-times"></i>';
  closeBtn.onclick = () => backdrop.remove();
  
  modalHeader.appendChild(title);
  modalHeader.appendChild(closeBtn);
  modal.appendChild(modalHeader);

  const makeField = (label, id, type = 'text', val = '', options = []) => {
    const field = document.createElement('div');
    field.className = 'field';
    
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.htmlFor = id;
    
    let inputEl;
    
    if (type === 'select') {
      inputEl = document.createElement('select');
      inputEl.id = id;
      
      options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        if (opt.value === val) option.selected = true;
        inputEl.appendChild(option);
      });
    } else {
      inputEl = document.createElement('input');
      inputEl.type = type;
      inputEl.id = id;
      inputEl.value = val;
    }
    
    field.appendChild(labelEl);
    field.appendChild(inputEl);
    return { field, input: inputEl };
  };

  // Create form fields
  const nomeField = makeField('Nome completo *', 'pt_name', 'text', existing?.nome || '');
  const idadeField = makeField('Idade', 'pt_idade', 'number', existing?.idade || '');
  const sexoField = makeField('Sexo', 'pt_sexo', 'select', existing?.sexo || '', [
    { value: '', text: 'Não informado' },
    { value: 'M', text: 'Masculino' },
    { value: 'F', text: 'Feminino' },
    { value: 'Outro', text: 'Outro' }
  ]);
  
  const obsField = document.createElement('div');
  obsField.className = 'field';
  const obsLabel = document.createElement('label');
  obsLabel.textContent = 'Observações';
  obsLabel.htmlFor = 'pt_obs';
  const obsInput = document.createElement('textarea');
  obsInput.id = 'pt_obs';
  obsInput.rows = 3;
  obsInput.placeholder = 'Observações adicionais sobre o paciente...';
  obsInput.value = existing?.observacoes || '';
  obsField.appendChild(obsLabel);
  obsField.appendChild(obsInput);
  
  // Add fields to modal
  modal.appendChild(nomeField.field);
  modal.appendChild(idadeField.field);
  modal.appendChild(sexoField.field);
  modal.appendChild(obsField);

  const formActions = document.createElement('div');
  formActions.className = 'form-actions';
  
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'btn btn-outline';
  cancel.textContent = 'Cancelar';
  cancel.onclick = () => backdrop.remove();
  
  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'btn btn-success';
  save.innerHTML = '<i class="fas fa-save"></i> Salvar';
  
  save.onclick = async () => {
    if (!nomeField.input.value.trim()) {
      alert('O nome do paciente é obrigatório.');
      nomeField.input.focus();
      return;
    }
    
    try {
      if (!state.currentUser) {
        alert('Usuário não autenticado. Por favor, faça login novamente.');
        return;
      }

      const patientData = {
        nome: nomeField.input.value.trim(),
        idade: idadeField.input.value ? parseInt(idadeField.input.value) : null,
        sexo: sexoField.input.value || null,
        observacoes: obsInput.value,
        user_id: state.currentUser.id
      };

      console.log('💾 Salvando paciente:', patientData);

      let result;
      if (existing?.id) {
        result = await window.supabase
          .from('patients')
          .update(patientData)
          .eq('id', existing.id)
          .select();
      } else {
        result = await window.supabase
          .from('patients')
          .insert([patientData])
          .select();
      }

      if (result.error) {
        console.error('❌ Erro do Supabase:', result.error);
        throw result.error;
      }

      const savedPatient = result.data[0];
      
      // Update local state
      state.patients[savedPatient.id] = {
        ...savedPatient,
        dietas: existing?.dietas || []
      };
      
      initPatientUI();
      backdrop.remove();
      
      // Refresh patient list if in manager
      const searchInput = document.getElementById('patientSearch');
      if (searchInput) {
        const modalElement = searchInput.closest('.modal');
        if (modalElement) {
          const container = modalElement.querySelector('div[style*="max-height"]');
          if (container) {
            renderPatientList(searchInput.value.trim().toLowerCase(), container);
          }
        }
      }
      
      console.log('✅ Paciente salvo com sucesso:', savedPatient.id);
      
    } catch (error) {
      console.error('❌ Erro ao salvar paciente:', error);
      alert('Erro ao salvar paciente: ' + error.message);
    }
  };
  
  formActions.appendChild(cancel);
  formActions.appendChild(save);
  modal.appendChild(formActions);
  
  backdrop.appendChild(modal);
  root.appendChild(backdrop);
}

export function selectPatient(id) {
  const p = state.patients[id];
  if (!p) return;
  
  state.patient = { ...p };
  initPatientUI();
  renderMeals();
  renderSummary();
}