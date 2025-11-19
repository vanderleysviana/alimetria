// src/patients.js
// facade that re-exports patient-related API (keeps compatibility with existing imports)

export { initPatientUI, openPatientManager, selectPatient } from './patientManager.js';
export { openPatientDiets, createNewDietForPatient, saveCurrentSessionAsDiet, loadDietToSession, saveEditingDiet } from './patientDiets.js';