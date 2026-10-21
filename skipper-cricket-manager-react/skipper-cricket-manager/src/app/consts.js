export const ROLE_NAME = { BAT: 'Batter', WK: 'Wicketkeeper', AR: 'All-rounder', BWL: 'Bowler' };
export const ROLE_ORD = { BAT: 0, WK: 1, AR: 2, BWL: 3 };
export const BOWL_SHORT = { RF: 'RF', RFM: 'RFM', RM: 'RM', LF: 'LF', LFM: 'LFM', LM: 'LM', OB: 'OB', LB: 'LB', SLA: 'SLA', LWS: 'LWS', '-': '' };
export const STAGE_NAME = { Q1: 'Qualifier 1', E: 'Eliminator', Q2: 'Qualifier 2', F: 'Final', SF: 'Semi-final' };
export const COMP_ORDER = [
  ['INTL', 'International', 'Coach a national side through Tests, ODIs, T20Is and World Cups'],
  ['IPL', 'IPL', 'Ten franchises, auctions every winter'],
  ['BBL', 'Big Bash League', "Australia's summer T20"],
  ['PSL', 'Pakistan Super League', 'Eight teams in 2026'],
  ['SA20', 'SA20', "South Africa's franchise league"],
  ['CPL', 'Caribbean Premier League', 'Seven teams across the islands'],
  ['HUN', 'The Hundred', '100-ball cricket in England'],
  ['ILT20', 'International League T20', 'UAE-based franchise league'],
  ['MLC', 'Major League Cricket', 'T20 in the USA'],
  ['CC1', 'County Championship Div 1', 'Four-day cricket, promotion and relegation'],
  ['CC2', 'County Championship Div 2', 'Four-day cricket, win promotion'],
  ['SHF', 'Sheffield Shield', 'Australian first-class cricket'],
];
export const fmtWord = (f) => (f === 'TEST' ? 'Test' : f === 'ODI' ? 'ODI' : f === 'T20' ? 'T20I' : f);
