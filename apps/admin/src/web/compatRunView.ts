// 호환성 실행 중 · 결과 화면의 판단 — 실행 순서 줄 · 진행 셈 · 카드 묶기 · 미점검 까닭 묶기 (도메인/호환성 §3.13 「결과 · 판정」 · §8.17 ③ · ④)
// 화면 조각은 CompatRun*.tsx, 판단은 여기

import type { CompatCard, CompatRow, CompatRunDevice, CompatRunResult, 칸값 } from './compatApi.js';

type 번역 = (키: string, 값?: Record<string, string | number>) => string;

/** 비전 의심 종류 (비전 안내서 `issues[].kind`). 모르는 종류는 받은 글자 그대로 둔다. 영어 표의 키다 */
export const 의심글자: Record<string, string> = {
  overlap: '요소 겹침',
  'text-overflow': '텍스트 잘림',
  misaligned: '배치 틀어짐',
  'font-broken': '글꼴 깨짐',
  'render-broken': '그리기 깨짐',
  offscreen: '화면 밖',
};

/** 표 칸 글자. 영어 표의 키다 */
export const 칸글자: Record<칸값, string> = { OK: '·', PENDING: '미판정', CONFIRMED: '확정', NOT_DEFECT: '아님', UNCHECKED: '미점검' };

/** 실행 순서의 상태 알약. 영어 표의 키다 */
export const 상태글자: Record<CompatRunDevice['state'], string> = {
  WAIT: '대기',
  RUNNING: '실행 중',
  CHECKING: 'AI 점검 중',
  DONE: '완료',
  SKIPPED: '건너뜀',
  STOPPED: '중단됨',
};

/** 끝난 상태 — 실행 창의 「점검 상태 4 / 14 완료」 */
export const 끝났나 = (d: Pick<CompatRunDevice, 'state'>): boolean => d.state === 'DONE' || d.state === 'SKIPPED' || d.state === 'STOPPED';

/** 폴더블은 꽂힌 상태를 적는다 — 원격 접기가 생기면 한 폰이 두 줄로 선다 (§3.13 「디바이스 · 점검 상태」) */
export const 접힘글자 = (d: Pick<CompatRunDevice, 'fold'>, t: 번역): string | null => (d.fold === 'OPEN' ? t('펼침') : d.fold === 'FOLDED' ? t('접힘') : null);

/** 실행 순서 한 줄의 설명 — 시안 ③ `AI 점검 완료 · 결함 의심 1` · `케이스 6 / 9` */
export function 순서설명(d: CompatRunDevice, 의심수: number, t: 번역): string {
  const 접힘 = 접힘글자(d, t);
  const 본 =
    d.state === 'RUNNING'
      ? t('케이스 {끝난} / {전체}', { 끝난: Math.min(d.cases.done + 1, d.cases.total), 전체: d.cases.total })
      : d.state === 'CHECKING'
        ? t('AI 점검 {끝난} / {전체}장', { 끝난: d.checks.done, 전체: d.checks.total })
        : d.state === 'DONE'
          ? t('AI 점검 완료 · 결함 의심 {수}', { 수: 의심수 })
          : d.state === 'WAIT'
            ? ''
            : (d.skipReason ?? '');
  return [접힘, 본].filter((x): x is string => x !== null && x !== '').join(' · ');
}

/** 상태마다 의심이 나온 카드 수 */
export function 상태별의심(cards: readonly CompatCard[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const c of cards) m.set(c.seq, (m.get(c.seq) ?? 0) + 1);
  return m;
}

export interface 진행셈 {
  끝난: number;
  전체: number;
  실행중: number;
  점검중: number;
  대기: number;
  /** 아직 결함 아님으로 거르지 않은 의심 카드 */
  의심: number;
  /** 끝난 상태로 남은 상태를 어림한 분. 끝난 상태가 없으면 null */
  남은분: number | null;
}

export function 진행(r: Pick<CompatRunResult, 'devices' | 'cards' | 'run'>, 지금: number): 진행셈 {
  const 끝난 = r.devices.filter(끝났나).length;
  const 전체 = r.devices.length;
  const 지난 = 지금 - Date.parse(r.run.startedAt);
  return {
    끝난,
    전체,
    실행중: r.devices.filter((d) => d.state === 'RUNNING').length,
    점검중: r.devices.filter((d) => d.state === 'CHECKING').length,
    대기: r.devices.filter((d) => d.state === 'WAIT').length,
    의심: r.cards.filter((c) => c.verdict !== 'NOT_DEFECT').length,
    // ponytail: 끝난 상태의 평균으로 어림한다. 상태마다 케이스 수가 같아 크게 안 빗나간다 — 케이스 소요 기록으로 셀 일이 생기면 서버가 준다
    남은분: 끝난 === 0 || Number.isNaN(지난) ? null : Math.max(1, Math.round(((지난 / 끝난) * (전체 - 끝난)) / 60000)),
  };
}

/** 실행 창 왼쪽 카드 — 지금 도는 상태. 없으면 점검 중인 첫 상태다 */
export const 지금상태 = (devices: readonly CompatRunDevice[]): CompatRunDevice | null =>
  devices.find((d) => d.state === 'RUNNING') ?? devices.find((d) => d.state === 'CHECKING') ?? null;

/** 실행 창 오른쪽 작은 그림 — 늦게 받은 의심 화면부터 */
export const 최근의심 = (cards: readonly CompatCard[], 수 = 3): CompatCard[] =>
  [...cards].filter((c) => c.verdict !== 'NOT_DEFECT').sort((a, b) => b.screenId - a.screenId).slice(0, 수);

export type 거르개 = '미판정 먼저' | '결함 확정' | '전체';

export interface 카드묶음 {
  key: string;
  name: string;
  cards: CompatCard[];
  /** 의심이 나온 점검 상태 수 */
  발생: number;
  확정: number;
  미판정: number;
}

/**
 * 한 화면의 카드들을 한 묶음으로 — 표 차례(화면 열쇠 차례)를 따른다 (§8.17 ④).
 * `미판정 먼저` 는 미판정 카드가 있는 묶음을 앞에, 묶음 안에서도 미판정 카드를 앞에 둔다. `결함 확정` 은 확정 카드만 남긴다
 */
export function 카드묶기(rows: readonly CompatRow[], cards: readonly CompatCard[], 거름: 거르개): 카드묶음[] {
  const 묶음들 = rows.flatMap((r) => {
    const 것들 = cards.filter((c) => c.key === r.key && (거름 !== '결함 확정' || c.verdict === 'CONFIRMED'));
    if (것들.length === 0) return [];
    const 미판정 = 것들.filter((c) => c.verdict === null).length;
    return [{
      key: r.key,
      name: r.name,
      cards: 거름 === '미판정 먼저' ? [...것들].sort((a, b) => Number(a.verdict !== null) - Number(b.verdict !== null)) : 것들,
      발생: new Set(것들.map((c) => c.seq)).size,
      확정: 것들.filter((c) => c.verdict === 'CONFIRMED').length,
      미판정,
    }];
  });
  return 거름 === '미판정 먼저' ? [...묶음들].sort((a, b) => Number(a.미판정 === 0) - Number(b.미판정 === 0)) : 묶음들;
}

export interface 미점검줄 {
  key: string;
  name: string;
  /** 까닭마다 그 까닭으로 못 본 디바이스 이름들 — 시안 `3대 미점검 — DMA-UI-040 이 5단계에서 실패 (SM-A325N · …)` */
  까닭들: { 까닭: string; 디바이스: string[] }[];
}

const 열이름 = (d: CompatRunDevice, t: 번역) => [d.model, 접힘글자(d, t)].filter((x): x is string => x !== null).join(' ');

export function 미점검들(rows: readonly CompatRow[], devices: readonly CompatRunDevice[], t: 번역): 미점검줄[] {
  const 상태 = new Map(devices.map((d) => [d.seq, d]));
  return rows.flatMap((r) => {
    const 묶음 = new Map<string, string[]>();
    for (const c of r.cells) {
      if (c.value !== 'UNCHECKED') continue;
      const 까닭 = c.reason ?? t('찍힌 화면이 없습니다');
      const d = 상태.get(c.seq);
      묶음.set(까닭, [...(묶음.get(까닭) ?? []), d === undefined ? String(c.seq) : 열이름(d, t)]);
    }
    return 묶음.size === 0 ? [] : [{ key: r.key, name: r.name, 까닭들: [...묶음].map(([까닭, 디바이스]) => ({ 까닭, 디바이스 })) }];
  });
}

/** 표의 마지막 열 — 의심이 나온 상태 수 / 전체 상태, 의심 없이 미점검만 있으면 `미점검 N` */
export function 발생글(r: CompatRow, 상태수: number, t: 번역): string {
  const 의심 = r.cells.filter((c) => c.value === 'PENDING' || c.value === 'CONFIRMED' || c.value === 'NOT_DEFECT').length;
  if (의심 > 0) return `${String(의심)} / ${String(상태수)}`;
  return t('미점검 {수}', { 수: r.cells.filter((c) => c.value === 'UNCHECKED').length });
}

/** 의심 네모를 그림 위 퍼센트 자리로 — box 는 원본 픽셀 [x, y, 가로, 세로] 근사값이다. 그림 크기를 모르거나 꼴이 틀리면 null */
export function 네모자리(box: readonly number[], 가로: number, 세로: number): { left: string; top: string; width: string; height: string } | null {
  if (box.length !== 4 || 가로 <= 0 || 세로 <= 0) return null;
  const [x, y, w, h] = box as [number, number, number, number];
  const 퍼 = (v: number, 전체: number) => `${String(Math.max(0, Math.min(100, (v * 100) / 전체)))}%`;
  return { left: 퍼(x, 가로), top: 퍼(y, 세로), width: 퍼(w, 가로), height: 퍼(h, 세로) };
}

/** 카드 아래 한 줄 — 시안 `DMA-UI-031 4단계 · 터치 직전 캡처` */
export const 찍은때 = (c: Pick<CompatCard, 'tcId' | 'step'>, t: 번역): string =>
  c.step === null ? c.tcId : t('{번호} {단계}단계 · 터치 직전 캡처', { 번호: c.tcId, 단계: c.step });
