export type VerificationMethod = 'A' | 'I' | 'E';

export type RequirementDefinition = {
  id: string;
  titleEs: string;
  titleEn: string;
  targetEs: string;
  targetEn: string;
  methods: VerificationMethod[];
};

export const PROJECT_REQUIREMENTS: RequirementDefinition[] = [
  { id: 'R1', titleEs: 'Altitud mínima', titleEn: 'Minimum altitude', targetEs: 'h_req ≥ 150 m @ 85° elevación', targetEn: 'h_req ≥ 150 m @ 85° elevation', methods: ['A','E'] },
  { id: 'R2', titleEs: 'Aterrizaje controlado', titleEn: 'Controlled landing', targetEs: 'V_imp ≤ 5 m/s', targetEn: 'V_imp ≤ 5 m/s', methods: ['A','E'] },
  { id: 'R3', titleEs: 'Diámetro propulsivo', titleEn: 'Propulsive diameter', targetEs: 'Contenedor d_ext = 50 mm', targetEn: 'Container d_ext = 50 mm', methods: ['I'] },
  { id: 'R4', titleEs: 'Montaje pre-lanzamiento propulsor', titleEn: 'Pre-launch motor installation', targetEs: 'Montaje verificable antes del lanzamiento', targetEn: 'Verifiable installation before launch', methods: ['I'] },
  { id: 'R5', titleEs: 'Longitud mínima del cohete', titleEn: 'Minimum rocket length', targetEs: 'L ≥ 800 mm', targetEn: 'L ≥ 800 mm', methods: ['I'] },
  { id: 'R6', titleEs: 'Cofia desmontable para paracaídas', titleEn: 'Removable parachute nose', targetEs: 'Acceso y liberación del sistema de recuperación', targetEn: 'Recovery-system access and release', methods: ['I','E'] },
  { id: 'R7', titleEs: 'Carga útil / módulo inercial', titleEn: 'Payload / inertial module', targetEs: '100 g TBC', targetEn: '100 g TBC', methods: ['I','A'] },
  { id: 'R8', titleEs: 'Máxima presión dinámica', titleEn: 'Maximum dynamic pressure', targetEs: 'MaxQ, t_MaxQ, h_MaxQ', targetEn: 'MaxQ, t_MaxQ, h_MaxQ', methods: ['A'] },
  { id: 'R9', titleEs: 'Sistema de coordenadas Cátedra', titleEn: 'Course coordinate system', targetEs: '+X axial, origen en base', targetEn: '+X axial, origin at base', methods: ['A'] },
  { id: 'R10', titleEs: 'Identificación oficial', titleEn: 'Official identification', targetEs: '2× logos UTN FRH opuestos', targetEn: '2× opposing UTN FRH logos', methods: ['I'] },
  { id: 'R11', titleEs: 'Alta visibilidad', titleEn: 'High visibility', targetEs: '2× franjas reflectivas', targetEn: '2× reflective bands', methods: ['I'] },
];

export const VERIFICATION_METHOD_LABELS: Record<VerificationMethod, { es: string; en: string }> = {
  A: { es: 'Análisis', en: 'Analysis' },
  I: { es: 'Inspección', en: 'Inspection' },
  E: { es: 'Ensayo', en: 'Test' },
};
