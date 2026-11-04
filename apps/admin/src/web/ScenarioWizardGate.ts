// E2E 마법사에서 단계를 넘기기 전에 막는 까닭 — 다음 버튼과 주소로 앞 단계에 가려는 이동이 같은 검사를 쓴다

import type { use말 } from './i18n.js';
import type { 마법사단계 } from './ScenarioWizardHelp.js';
import type { 시작방법 } from './ScenarioWizardStart.js';

export interface 막는상황 {
  방법: 시작방법 | null;
  추천만드는중: boolean;
  고른후보: number | null;
  단계수: number;
  값막힘: boolean;
  시험중: boolean;
}

export function 막는이유(st: 마법사단계, 상황: 막는상황): string | null {
  if (st === 'start') return 상황.방법 === null ? '시작 방법을 고릅니다' : null;
  if (st === 'ai') {
    if (상황.추천만드는중) return '추천을 만드는 중입니다. 끝나면 후보를 골라 주세요';
    return 상황.고른후보 === null ? '후보를 하나 골라 주세요. 맞는 후보가 없으면 「이전」에서 「직접 고르기」로 바꿉니다' : null;
  }
  if (st === 'steps') return 상황.단계수 === 0 ? '단계를 하나 이상 넣습니다' : null;
  if (st === 'values') return 상황.값막힘 ? '빈 칸이 남은 값 연결이 있습니다. 적거나 삭제합니다' : null;
  if (st === 'trial') return 상황.시험중 ? '시험 실행이 끝나면 넘어갑니다' : null;
  return null;
}

// 막지 않고 바닥에 남기는 안내 (결정 15 — 시험 실행은 저장 조건이 아니다)
export function 안내글(st: 마법사단계, 상황: { 미확인: number; 시험단계: string; 시험멈춤: boolean }, t: ReturnType<typeof use말>): string | null {
  if (st === 'values' && 상황.미확인 > 0) return t('확인하지 않은 값 연결이 {수}곳 있습니다', { 수: 상황.미확인 });
  if (st !== 'trial') return null;
  if (상황.시험단계 === 'idle' || 상황.시험단계 === 'failed') return t('시험 없이 넘어가도 저장할 수 있습니다');
  return 상황.시험단계 === 'done' && 상황.시험멈춤 ? t('멈춘 채로도 저장할 수 있습니다') : null;
}
