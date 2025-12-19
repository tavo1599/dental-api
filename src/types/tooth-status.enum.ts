export enum ToothStatus {
  HEALTHY = 'healthy',
  
  // ROJOS (Patología / Defectuoso)
  CARIES = 'caries',
  FILLED_DEFECTIVE = 'filled_defective',
  SEALANT_DEFECTIVE = 'sealant_defective',
  CROWN_DEFECTIVE = 'crown_defective',
  FRACTURE = 'fracture',
  
  // AZULES (Buen Estado / Existente)
  FILLED = 'filled',
  SEALANT = 'sealant',
  CROWN = 'crown',
  
  // VERDES (Evolucionado / Recién Realizado) - NUEVOS
  FILLED_EVOLVED = 'filled_evolved',
  SEALANT_EVOLVED = 'sealant_evolved',
  CROWN_EVOLVED = 'crown_evolved',
  ENDODONTICS_EVOLVED = 'endodontics_evolved',
  
  // OTROS
  DISCHROMIA = 'dischromia',
  TEMPORARY_CROWN = 'temporary_crown',
  ENDODONTICS = 'endodontics',
  IMPLANT = 'implant',
  PONTIC = 'pontic',
  EXTRACTION_NEEDED = 'extraction_needed',
  EXTRACTED = 'extracted',
  SUPERNUMERARY = 'supernumerary'
}