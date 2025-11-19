// src/pdf.js - VERSÃO CORRIGIDA (usando jsPDF global)
import { state, MEALS, formatNumber, calcScaled } from './state.js';
import { aggregateAll } from './ui.js';

export function savePatientToPdfContext(){
  // create doc usando jsPDF global
  const doc = new window.jsPDF({unit:'pt',format:'a4'});
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const padding = 36;
  const contentWidth = pageWidth - padding*2;

  // styling helpers
  const blueTitle = '#1A73E8';
  const darkText = 30;
  const small = 10;
  const normal = 12;
  const titleSize = 16;

  doc.setFont('helvetica');

  // Header - centered: Patient name, Diet name, Date
  const patientName = state.patient?.nome || '-';
  const dietName = state.editingDiet?.dietName || '';
  const dateStr = new Date().toLocaleString();

  doc.setFontSize(titleSize);
  doc.setTextColor(blueTitle);
  doc.text(patientName, pageWidth/2, 48, {align: 'center'});
  doc.setFontSize(normal);
  if(dietName){
    doc.setTextColor(10,30,80);
    doc.text(dietName, pageWidth/2, 68, {align: 'center'});
  }
  doc.setFontSize(small);
  doc.setTextColor(darkText);
  doc.text(dateStr, pageWidth/2, dietName ? 84 : 68, {align: 'center'});

  // horizontal divider
  const dividerY = dietName ? 92 : 80;
  doc.setDrawColor(79,143,247);
  doc.setLineWidth(0.8);
  doc.line(padding, dividerY, pageWidth - padding, dividerY);

  // start content after header
  let y = dividerY + 16;
  const bottomLimit = pageHeight - 40;

  // Helper: ensure there's enough space for a block; if not, add page and reset y
  function ensureSpace(heightNeeded){
    if(y + heightNeeded > bottomLimit){
      doc.addPage();
      y = padding;
      // redraw simple header on new page to keep context minimal (but user requested avoid splitting meals between pages)
      // use a small divider at top to indicate continuation
      doc.setFontSize(10);
      doc.setTextColor(79,143,247);
      doc.line(padding, y - 8, pageWidth - padding, y - 8);
    }
  }

  // Patient data section
  const patientBlock = [];
  patientBlock.push(`Nome: ${patientName}`);
  if(state.patient?.idade) patientBlock.push(`Idade: ${state.patient.idade}`);
  if(state.patient?.observacoes) patientBlock.push(`Observações: ${state.patient.observacoes}`);

  const patientBlockHeight = patientBlock.length * 14 + 8;
  ensureSpace(patientBlockHeight);
  doc.setFontSize(normal);
  doc.setTextColor(10,30,80);
  doc.text('Dados do Paciente', padding, y);
  y += 16;
  doc.setFontSize(small);
  doc.setTextColor(darkText);
  patientBlock.forEach(line=>{
    doc.text(line, padding, y);
    y += 14;
  });
  y += 6;

  // Summary nutritional totals
  const total = aggregateAll();
  const summaryLines = [];
  summaryLines.push(`Calorias: ${formatNumber(total.calorias,0)} kcal`);
  summaryLines.push(`Proteínas: ${formatNumber(total.proteina)} g`);
  summaryLines.push(`Carboidratos: ${formatNumber(total.carboidrato)} g`);
  summaryLines.push(`Lipídios: ${formatNumber(total.lipidio)} g`);
  // include any other numeric nutrients present in total
  Object.keys(total).forEach(k=>{
    if(!['calorias','proteina','carboidrato','lipidio','fibra'].includes(k)){
      summaryLines.push(`${k.charAt(0).toUpperCase()+k.slice(1)}: ${formatNumber(total[k])}`);
    }
  });
  if(total.fibra !== undefined) summaryLines.push(`Fibras: ${formatNumber(total.fibra)} g`);

  const summaryBlockHeight = summaryLines.length * 14 + 22;
  ensureSpace(summaryBlockHeight);
  doc.setFontSize(normal);
  doc.setTextColor(10,30,80);
  doc.text('Resumo Nutricional Total', padding, y);
  y += 16;
  doc.setFontSize(small);
  doc.setTextColor(darkText);
  summaryLines.forEach(line=>{
    doc.text(line, padding, y);
    y += 14;
  });
  y += 8;

  // Meals: render each meal as an indivisible block (do not split across pages)
  MEALS.forEach(meal=>{
    const foods = state.meals[meal] || [];

    // Table layout params
    const colPadding = 6;
    const colWidths = {
      name: Math.max(160, contentWidth * 0.40),
      qty: 60,
      kcal: 70,
      prot: 60,
      carb: 60,
      lip: 60,
      fib: 60
    };
    // adjust if contentWidth smaller
    const totalCols = colWidths.name + colWidths.qty + colWidths.kcal + colWidths.prot + colWidths.carb + colWidths.lip + colWidths.fib;
    const scaleFactor = contentWidth / totalCols;
    if(scaleFactor < 1){
      Object.keys(colWidths).forEach(k=> colWidths[k] = Math.floor(colWidths[k] * scaleFactor));
    }

    // estimate height: title + header + each row (approx) + meal summary + spacing
    const estimatedRowHeight = 14;
    const estimatedHeight = 16 + 18 + (foods.length ? foods.length * estimatedRowHeight : estimatedRowHeight) + 18 + 14;

    // if the meal would not fit, start new page so meal stays intact
    if(y + estimatedHeight > bottomLimit){
      doc.addPage();
      y = padding;
      // small top divider to indicate continuation
      doc.setDrawColor(220,235,255);
      doc.setLineWidth(0.8);
      doc.line(padding, y - 8, pageWidth - padding, y - 8);
      y += 4;
    }

    // meal title
    doc.setFontSize(normal);
    doc.setTextColor(26,115,232);
    doc.text(meal, padding, y);
    y += 16;

    // draw table header
    doc.setFontSize(small);
    doc.setTextColor(10,30,80);
    const startX = padding;
    let x = startX;
    // header background
    doc.setFillColor(240,247,255);
    doc.rect(startX - 2, y - 4, Object.values(colWidths).reduce((a,b)=>a+b,0) + 8, 18, 'F');
    doc.setDrawColor(200,210,230);
    doc.setLineWidth(0.4);
    doc.rect(startX - 2, y - 4, Object.values(colWidths).reduce((a,b)=>a+b,0) + 8, 18);

    doc.text('Alimento', x + colPadding, y + 8);
    x += colWidths.name;
    doc.text('Qtd (g)', x + colPadding, y + 8);
    x += colWidths.qty;
    doc.text('Kcal', x + colPadding, y + 8);
    x += colWidths.kcal;
    doc.text('P (g)', x + colPadding, y + 8);
    x += colWidths.prot;
    doc.text('C (g)', x + colPadding, y + 8);
    x += colWidths.carb;
    doc.text('L (g)', x + colPadding, y + 8);
    x += colWidths.lip;
    doc.text('Fib (g)', x + colPadding, y + 8);
    y += 20;

    if(!foods.length){
      doc.setFontSize(small);
      doc.setTextColor(darkText);
      doc.text('— Refeição vazia —', padding + 6, y);
      y += 18;
    }else{
      // draw rows
      foods.forEach((it, idx)=>{
        const f = state.taco[it.id] || { name: 'Desconhecido', calorias:0, proteina:0, carboidrato:0, lipidio:0, fibra:0 };
        const kcal = formatNumber(calcScaled(f.calorias||0, it.qty),0);
        const p = formatNumber(calcScaled(f.proteina||0, it.qty));
        const c = formatNumber(calcScaled(f.carboidrato||0, it.qty));
        const l = formatNumber(calcScaled(f.lipidio||0, it.qty));
        const fib = formatNumber(calcScaled(f.fibra||0, it.qty));

        // prepare text lines for name (may wrap)
        const nameColWidth = colWidths.name - colPadding*1.5;
        const nameLines = doc.splitTextToSize(f.name, nameColWidth);

        // determine row height based on wrapped name lines
        const rowHeight = Math.max(14, nameLines.length * 12);

        // ensure we don't overflow page within a meal — but meal already reserved space; still check and add page if necessary
        if(y + rowHeight > bottomLimit){
          doc.addPage();
          y = padding;
        }

        // draw row background alternating lightly
        if(idx % 2 === 0){
          doc.setFillColor(250, 252, 255);
          doc.rect(padding - 2, y - 2, Object.values(colWidths).reduce((a,b)=>a+b,0) + 8, rowHeight + 4, 'F');
        }

        // draw text columns
        x = startX;
        doc.setTextColor(darkText);
        doc.setFontSize(11);
        // name (multi-line)
        doc.text(nameLines, x + colPadding, y + 10);
        x += colWidths.name;
        // qty
        doc.text(String(it.qty), x + colPadding, y + 10);
        x += colWidths.qty;
        // kcal
        doc.text(String(kcal), x + colPadding, y + 10);
        x += colWidths.kcal;
        // prot
        doc.text(String(p), x + colPadding, y + 10);
        x += colWidths.prot;
        // carb
        doc.text(String(c), x + colPadding, y + 10);
        x += colWidths.carb;
        // lip
        doc.text(String(l), x + colPadding, y + 10);
        x += colWidths.lip;
        // fib
        doc.text(String(fib), x + colPadding, y + 10);

        // draw row separators
        doc.setDrawColor(230,235,245);
        doc.setLineWidth(0.4);
        doc.line(startX - 2, y + rowHeight + 4, startX - 2 + Object.values(colWidths).reduce((a,b)=>a+b,0) + 8, y + rowHeight + 4);

        y += rowHeight + 6;
      });

      // meal totals
      const mealTot = (()=> {
        const t = {calorias:0,proteina:0,carboidrato:0,lipidio:0,fibra:0};
        foods.forEach(item=>{
          const f = state.taco[item.id] || {};
          t.calorias += calcScaled(f.calorias||0, item.qty);
          t.proteina += calcScaled(f.proteina||0, item.qty);
          t.carboidrato += calcScaled(f.carboidrato||0, item.qty);
          t.lipidio += calcScaled(f.lipidio||0, item.qty);
          t.fibra += calcScaled(f.fibra||0, item.qty||0);
        });
        return t;
      })();
      y += 2;
      doc.setFontSize(small);
      doc.setTextColor(10,30,80);
      doc.text(`Resumo da Refeição — Kcal ${formatNumber(mealTot.calorias,0)} • P ${formatNumber(mealTot.proteina)} g • C ${formatNumber(mealTot.carboidrato)} g • L ${formatNumber(mealTot.lipidio)} g • Fib ${formatNumber(mealTot.fibra)} g`, padding + 6, y);
      y += 18;
    }

    // small divider between meals
    doc.setDrawColor(220,235,255);
    doc.setLineWidth(0.6);
    doc.line(padding, y - 6, pageWidth - padding, y - 6);
    y += 6;
  });

  // Final overall summary and alerts - ensure fits, otherwise add page but keep whole block together
  const alerts = [];
  if(total.proteina < 50) alerts.push('Proteína insuficiente');
  if(total.calorias < 1200) alerts.push('Calorias abaixo do recomendado');
  if(total.calorias > 3000) alerts.push('Calorias acima do recomendado');
  // sodium example if present
  if(total.sodio && total.sodio > 2300) alerts.push('Excesso de sódio');

  const finalBlockLines = [
    `Resumo Final`,
    `Calorias: ${formatNumber(total.calorias,0)} kcal`,
    `Proteínas: ${formatNumber(total.proteina)} g`,
    `Carboidratos: ${formatNumber(total.carboidrato)} g`,
    `Lipídios: ${formatNumber(total.lipidio)} g`,
  ];
  // include other nutrients
  Object.keys(total).forEach(k=>{
    if(!['calorias','proteina','carboidrato','lipidio','fibra'].includes(k)){
      finalBlockLines.push(`${k.charAt(0).toUpperCase()+k.slice(1)}: ${formatNumber(total[k])}`);
    }
  });
  if(total.fibra !== undefined) finalBlockLines.push(`Fibras: ${formatNumber(total.fibra)} g`);
  if(alerts.length) finalBlockLines.push('', 'Alertas:'); alerts.forEach(a=> finalBlockLines.push(`- ${a}`));

  const finalBlockHeight = finalBlockLines.length * 14 + 12;
  ensureSpace(finalBlockHeight);

  doc.setFontSize(normal);
  doc.setTextColor(10,30,80);
  doc.text('Resumo Geral da Dieta', padding, y);
  y += 16;
  doc.setFontSize(small);
  doc.setTextColor(darkText);
  finalBlockLines.forEach(line=>{
    doc.text(line, padding, y);
    y += 14;
  });

  // save
  doc.save('dieta-taco.pdf');
}