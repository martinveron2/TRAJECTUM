export type NumericField = number | '';

export type Vehicle = {
  totalLength: NumericField;
  diameter: NumericField;
  noseLength: NumericField;
  bayLength: NumericField;
  bodyLength: NumericField;
  wall: NumericField;
  finCount: NumericField;
  rootChord: NumericField;
  tipChord: NumericField;
  span: NumericField;
  sweep: NumericField;
  finX: NumericField;
  airfoil: string;
  noseProfile: string;
  launchAngle: NumericField;
  cd: NumericField;
  parachuteCd: NumericField;
  parachuteArea: NumericField;
  deployAltitude: NumericField;
  deployDelay: NumericField;
};

export type MotorConfig = {
  id: string;
  label: string;
  designation: string;
  propellant: string;
  burn: NumericField;
  impulse: NumericField;
  maxThrust: NumericField;
  propellantMass: NumericField;
  dryMass: NumericField;
  officialAverageThrust?: NumericField;
  thrustCurve?: Array<[number, number]>;
};
