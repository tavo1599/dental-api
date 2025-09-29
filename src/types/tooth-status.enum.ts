export enum ToothStatus {
  // Estados de Superficie
  HEALTHY = 'healthy',
  CARIES = 'caries',
  FILLED = 'filled',
  FILLED_DEFECTIVE = 'filled_defective',
  SEALANT = 'sealant',
  SEALANT_DEFECTIVE = 'sealant_defective',
  FRACTURE = 'fracture',
  DISCHROMIA = 'dischromia',

  // Estados de Diente Completo
  CROWN = 'crown',
  CROWN_DEFECTIVE = 'crown_defective',
  TEMPORARY_CROWN = 'temporary_crown',
  ENDODONTICS = 'endodontics',
  IMPLANT = 'implant',
  PONTIC = 'pontic',
  EXTRACTION_NEEDED = 'extraction_needed',
  EXTRACTED = 'extracted',
  SUPERNUMERARY = 'supernumerary',
}