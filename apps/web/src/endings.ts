/** 结局档次表，与 apps/api/src/lib/score.ts 的 ENDING_BONUS 一一对应 */
export interface EndingOption {
  id: string;
  name: string;
  kind: 'death' | 'good' | 'great' | 'renew';
}

export const ENDINGS: EndingOption[] = [
  { id: 'ascend', name: '登仙', kind: 'great' },
  { id: 'daotai', name: '道胎', kind: 'great' },
  { id: 'guowei', name: '证得果位', kind: 'great' },
  { id: 'zhenjun', name: '法相归位', kind: 'great' },
  { id: 'shizun', name: '世尊', kind: 'good' },
  { id: 'xianzun', name: '一代仙尊', kind: 'good' },
  { id: 'modao', name: '魔道至尊', kind: 'good' },
  { id: 'xiaoyao', name: '逍遥', kind: 'good' },
  { id: 'reinc', name: '百世书', kind: 'renew' },
  { id: 'sit', name: '坐化', kind: 'death' },
  { id: 'daohua', name: '道化', kind: 'death' },
  { id: 'fall', name: '陨落', kind: 'death' },
];

export const endingName = (id: string): string =>
  ENDINGS.find(e => e.id === id)?.name ?? id;

export const BOARD_LABEL: Record<string, string> = {
  score: '综合',
  realm: '境界',
  age: '寿元',
};
