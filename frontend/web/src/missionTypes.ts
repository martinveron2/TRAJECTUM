export type MissionSample = {
  t_s: number;
  phase: string;
  x_m: number;
  altitude_m: number;
  speed_m_s: number;
  vertical_speed_m_s: number;
  mach: number;
  q_pa: number;
  acceleration_g?: number;
  parachute_deployed: boolean;
};
