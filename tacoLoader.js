// src/tacoLoader.js
import { state } from './state.js';
import { renderMeals } from './ui.js';

// Esta função agora é mantida apenas para compatibilidade
// Os alimentos são carregados via loadFoodsFromDB no state.js
export async function loadTaco(){
  console.log('Carregamento de alimentos movido para loadFoodsFromDB');
  renderMeals(); // initial render after data loaded
}

// start loading immediately
loadTaco();