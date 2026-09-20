import type { MotorConfig, Vehicle } from '../types/engineering';

export const initialVehicle: Vehicle = {
  totalLength: 860,
  diameter: 63,
  noseLength: 180,
  bayLength: 180,
  bodyLength: 500,
  wall: 2,
  finCount: 4,
  rootChord: 80,
  tipChord: 40,
  span: 50,
  sweep: 40,
  finX: 780,
  airfoil: 'NACA 0012',
  noseProfile: 'tangent_ogive',
  launchAngle: 85,
  cd: 0.55,
  parachuteCd: 1.5,
  parachuteArea: 0.20,
  deployAltitude: '',
  deployDelay: 0,
};

export const initialMotorConfigs: MotorConfig[] = [
  {
    id: 'motor-1',
    label: 'SIMULACIÓN REALISTA',
    designation: 'A-100 RN (29%H) · curva KNDX',
    propellant: 'KNDX',
    burn: 0.5,
    impulse: 207,
    maxThrust: 600,
    propellantMass: 140,
    dryMass: 350,
    officialAverageThrust: 441,
    thrustCurve: [[0.00,0],[0.05,600],[0.10,550],[0.20,530],[0.30,500],[0.40,400],[0.45,50],[0.50,0]],
  },
  {
    id: 'motor-2',
    label: 'REFERENCIA ANALÍTICA',
    designation: 'A-100 RN · equivalente rectangular 414 N',
    propellant: 'KNDX',
    burn: 0.5,
    impulse: 207,
    maxThrust: 414,
    propellantMass: 140,
    dryMass: 350,
    officialAverageThrust: 441,
  },
];

export const motorAverageThrust = (motor: MotorConfig) => {
  if (motor.officialAverageThrust !== undefined && motor.officialAverageThrust !== '') return Number(motor.officialAverageThrust);
  const burn = Number(motor.burn);
  const impulse = Number(motor.impulse);
  return burn > 0 && Number.isFinite(impulse) ? impulse / burn : null;
};
