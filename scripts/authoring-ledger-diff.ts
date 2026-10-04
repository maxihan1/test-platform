// 요구 지문 파일 — 자료마다 합치기 · 앞 판과 견주기 · 반영 때 세 갈래 합치기 · PR 머리 한 줄 (§3.6 「요구 지문」)
// 파일을 읽고 쓰는 껍데기는 authoring-ledger-io.ts 다. 여기는 같은 입력이면 같은 결과를 낸다

import type { 원장 } from './authoring-ledger.js';

export interface 지문항목 {
  번호: string;
  자료: string;
  지문: string;
}

export interface 지문파일 {
  판: 1;
  /** 자료 이름 → 글자본 꼴(`.docx/pandoc`) */
  자료: Record<string, { 꼴: string }>;
  항목: 지문항목[];
}

export interface 판차이 {
  더함: string[];
  바뀜: string[];
  지움: string[];
  /** 문단 모드에서 같은 문단의 번호가 밀린 짝 — 다음 단계가 표 출처 칸을 옮길 재료다 */
  짝: { 앞: string; 새: string }[];
  /** 앞 판에 없는 자료 — 파일 이름만 바뀐 새 판에서 거짓 더함 · 지움이 안 나오게 따로 센다 */
  새자료: string[];
  /** 앞 판과 글자본 꼴이 달라 견주지 않은 자료 */
  꼴다름: string[];
}

export const 지문파일자리 = (서비스: string) => `docs/cases/${서비스}.fingerprint.json`;

/** 읽을 상한 — main 에서 읽는 파일이라 사람 · 자식이 키웠을 수 있다 */
const 읽기상한 = 1024 * 1024;
const 지문꼴 = /^[0-9a-f]{16}$/;

export function 지문파일글(f: 지문파일): string {
  return `${JSON.stringify(f, null, 2)}\n`;
}

const 글인가 = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length <= 200;

/** 모양이 틀리면 null — 손댄 파일로 차이를 지어내지 않는다 */
export function 지문파일읽기(글: string): 지문파일 | null {
  if (Buffer.byteLength(글, 'utf8') > 읽기상한) return null;
  let 값: unknown;
  try {
    값 = JSON.parse(글);
  } catch {
    return null;
  }
  if (typeof 값 !== 'object' || 값 === null) return null;
  const { 판, 자료, 항목 } = 값 as Record<string, unknown>;
  if (판 !== 1 || typeof 자료 !== 'object' || 자료 === null || !Array.isArray(항목)) return null;
  const 자료들 = Object.entries(자료);
  if (!자료들.every(([k, v]) => 글인가(k) && typeof v === 'object' && v !== null && 글인가((v as Record<string, unknown>)['꼴']))) return null;
  const 이름들 = new Set(자료들.map(([k]) => k));
  const 맞나 = (h: unknown): h is 지문항목 => {
    if (typeof h !== 'object' || h === null) return false;
    const { 번호, 자료: 이름, 지문 } = h as Record<string, unknown>;
    return 글인가(번호) && 글인가(이름) && 이름들.has(이름) && typeof 지문 === 'string' && 지문꼴.test(지문);
  };
  if (!항목.every(맞나)) return null;
  return {
    판: 1,
    자료: Object.fromEntries(자료들.map(([k, v]) => [k, { 꼴: (v as { 꼴: string }).꼴 }])),
    항목: 항목.map((h) => ({ 번호: h.번호, 자료: h.자료, 지문: h.지문 })),
  };
}

const 이번자료 = (r: 원장) => Object.keys(r.모드);
const 이번항목 = (r: 원장): 지문항목[] => r.항목.map((h) => ({ 번호: h.번호, 자료: h.자료, 지문: h.지문 ?? '' }));

/** 이번 원장 자료의 항목만 바꾸고 다른 자료 항목은 물려받는다 — 개정분만 보낸 요청이 앞 판 전체를 지우지 않게 */
export function 지문합치기(앞: 지문파일 | null, r: 원장): 지문파일 {
  const 이번 = new Set(이번자료(r));
  const 남길자료 = Object.entries(앞?.자료 ?? {}).filter(([k]) => !이번.has(k));
  return {
    판: 1,
    자료: Object.fromEntries([...남길자료, ...이번자료(r).map((k) => [k, { 꼴: r.꼴?.[k] ?? '' }] as const)]),
    항목: [...(앞?.항목 ?? []).filter((h) => !이번.has(h.자료)), ...이번항목(r)],
  };
}

/** 이번 원장의 자료마다 앞 판 같은 자료와 견준다. 꼴이 다르거나 앞 판에 없는 자료는 견주지 않고 따로 센다 */
export function 판견주기(앞: 지문파일, r: 원장): 판차이 {
  const 차이: 판차이 = { 더함: [], 바뀜: [], 지움: [], 짝: [], 새자료: [], 꼴다름: [] };
  const 새것 = 이번항목(r);
  for (const 자료 of 이번자료(r)) {
    const 앞꼴 = 앞.자료[자료]?.꼴;
    if (앞꼴 === undefined) {
      차이.새자료.push(자료);
      continue;
    }
    if (앞꼴 !== r.꼴?.[자료]) {
      차이.꼴다름.push(자료);
      continue;
    }
    const 옛 = 앞.항목.filter((h) => h.자료 === 자료);
    const 새 = 새것.filter((h) => h.자료 === 자료);
    if (r.모드[자료] === '번호') {
      const 옛표 = new Map(옛.map((h) => [h.번호, h.지문]));
      const 새번호 = new Set(새.map((h) => h.번호));
      for (const h of 새) {
        const 옛지문 = 옛표.get(h.번호);
        if (옛지문 === undefined) 차이.더함.push(h.번호);
        else if (옛지문 !== h.지문) 차이.바뀜.push(h.번호);
      }
      차이.지움.push(...옛.filter((h) => !새번호.has(h.번호)).map((h) => h.번호));
      continue;
    }
    // 문단 모드 — 번호는 앞에 문단 하나만 끼워도 밀린다. 같은 지문끼리 짝짓는다
    const 남은옛 = [...옛];
    for (const h of 새) {
      const i = 남은옛.findIndex((o) => o.지문 === h.지문);
      if (i < 0) {
        차이.더함.push(h.번호);
        continue;
      }
      const [o] = 남은옛.splice(i, 1);
      if (o !== undefined && o.번호 !== h.번호) 차이.짝.push({ 앞: o.번호, 새: h.번호 });
    }
    차이.지움.push(...남은옛.map((h) => h.번호));
  }
  return 차이;
}

const 번호들 = (xs: string[]) => (xs.length === 0 ? '' : `(${xs.slice(0, 10).join(' · ')}${xs.length > 10 ? ' …' : ''})`);

/** PR 본문 머리 한 줄 — 보고만 하고 막지 않는다 */
export function 차이줄(r: 판차이 | '앞 판 없음' | '못 읽음'): string {
  if (r === '앞 판 없음') return '기획서 판 차이 — 앞 판 지문 없음(반영하면 저장된다)';
  if (r === '못 읽음') return '⚠️ 앞 판 지문을 못 읽음';
  const 덧 = [
    ...(r.새자료.length > 0 ? [`새 자료 ${String(r.새자료.length)}${번호들(r.새자료)}`] : []),
    ...(r.꼴다름.length > 0 ? [`글자본 꼴이 달라 견주지 않음 — ${r.꼴다름.join(' · ')}`] : []),
  ];
  const 셋 = (['더함', '바뀜', '지움'] as const).map((k) => `${k} ${String(r[k].length)}${번호들(r[k])}`);
  return `기획서 판 차이 — ${[...셋, ...덧].join(' · ')}`;
}

const 열쇠 = (h: 지문항목) => `${h.자료}\u0000${h.번호}`;
const 같은가 = (a: 지문항목 | undefined, b: 지문항목 | undefined) => a?.지문 === b?.지문;

/**
 * 반영 때 main 과 요청이 둘 다 지문 파일을 고쳤으면 세 갈래로 합친다 — 요청이 바꾼(더한 · 지운) 항목이 이기고 나머지는 main 을 따른다.
 * 바탕이 없으면 둘을 합치고 같은 항목은 요청 것. 한쪽이 파일을 지웠으면 남은 쪽
 */
export function 지문세갈래(바탕: 지문파일 | null, main: 지문파일 | null, 요청: 지문파일 | null): 지문파일 | null {
  if (요청 === null) return main;
  if (main === null) return 요청;
  const [b, m, r] = [바탕, main, 요청].map((f) => new Map((f?.항목 ?? []).map((h) => [열쇠(h), h])));
  const 고른것 = (k: string): 지문항목 | undefined => {
    const 요청것 = r?.get(k);
    return 같은가(요청것, b?.get(k)) && (요청것 !== undefined) === b?.has(k) ? m?.get(k) : 요청것;
  };
  const 열쇠들 = [...new Set([...요청.항목, ...main.항목].map(열쇠))];
  const 항목 = 열쇠들.map(고른것).filter((h): h is 지문항목 => h !== undefined);
  const 쓰인 = new Set(항목.map((h) => h.자료));
  const 자료 = Object.fromEntries(Object.entries({ ...main.자료, ...요청.자료 }).filter(([k]) => 쓰인.has(k) || k in 요청.자료));
  return { 판: 1, 자료, 항목 };
}
