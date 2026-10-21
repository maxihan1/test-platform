// 성능 시나리오 마법사의 계산 — 테스트 유형별 구간 · 동시 사용자 산정 · 미리 보기 그래프 점 (도메인/성능 §3.9 「부하 설정」)

import { t, type 언어 } from './i18n.js';
import type { Stage, Target, TestType } from './perfApi.js';

export interface 부하칸 {
  maxVus: number;
  rampMin: number;
  holdMin: number;
  /** 스트레스 테스트가 먼저 머무는 피크. 산정 전이면 최대의 1/5 이다 — 최대 기본값이 피크의 5배라서 */
  peakVus?: number;
}

export const 기본부하칸: 부하칸 = { maxVus: 100, rampMin: 5, holdMin: 10 };

const 분 = (n: number) => Math.max(1, Math.round(n * 60));

/**
 * 유형을 고르면 채우는 구간 목록 (§3.9 「부하 설정」 표). 사람은 「상세 설정」에서 이것을 고친다.
 * 스트레스의 피크 5분 · 3분 머물기와 스파이크의 10초 · 2분은 시안 캔버스 버전 14 의 그래프 그대로다
 */
export function 구간만들기(유형: TestType, 칸: 부하칸): Stage[] {
  const 최대 = Math.max(1, Math.round(칸.maxVus));
  if (유형 === 'LOAD') return [{ durationSec: 분(칸.rampMin), target: 최대 }, { durationSec: 분(칸.holdMin), target: 최대 }, { durationSec: 60, target: 0 }];
  if (유형 === 'STRESS') {
    const 피크 = Math.min(최대, Math.max(1, Math.round(칸.peakVus ?? 최대 / 5)));
    return [{ durationSec: 300, target: 피크 }, { durationSec: 180, target: 피크 }, { durationSec: 분(칸.rampMin), target: 최대 }];
  }
  if (유형 === 'SPIKE') {
    const 기준 = Math.max(1, Math.round(최대 / 10));
    return [{ durationSec: 60, target: 기준 }, { durationSec: 10, target: 최대 }, { durationSec: 120, target: 최대 }, { durationSec: 10, target: 기준 }, { durationSec: 60, target: 기준 }];
  }
  return [{ durationSec: 분(칸.rampMin), target: 최대 }, { durationSec: 분(칸.holdMin), target: 최대 }];
}

export const 총초 = (구간: readonly Stage[]) => 구간.reduce((n, s) => n + s.durationSec, 0);
export const 최대목표 = (구간: readonly Stage[]) => 구간.reduce((n, s) => Math.max(n, s.target), 0);

/** 피크 동시 사용자 = 일 방문자 × 피크 집중률 × 평균 체류 시간(분) ÷ 피크 시간(분). 셋 중 하나라도 없으면 null — 화면이 그 칸을 묻는다 */
export function 피크계산(일방문자: number | null, 집중률: number | null, 체류분: number | null, 피크분 = 60): number | null {
  if (일방문자 === null || 집중률 === null || 체류분 === null || 피크분 <= 0) return null;
  return Math.ceil((일방문자 * 집중률 * 체류분) / 피크분);
}

/** 미리 보기 그래프의 꺾은선 점. 0초 0명에서 시작해 구간 끝마다 한 점이다 */
export function 그래프점(구간: readonly Stage[], 너비: number, 높이: number): string {
  const 끝 = Math.max(1, 총초(구간));
  const 위 = Math.max(1, 최대목표(구간));
  let 초 = 0;
  const 점 = [`0,${String(높이)}`];
  for (const s of 구간) {
    초 += s.durationSec;
    점.push(`${String(Math.round((초 / 끝) * 너비))},${String(Math.round(높이 - (s.target / 위) * (높이 - 4)))}`);
  }
  return 점.join(' ');
}

/** 지표마다 방향이 정해져 있다 — 응답시간 · 에러율은 이하, TPS 는 이상이다 (§3.9 「성능 목표」) */
export const 목표방향: Record<Target['metric'], Target['op']> = { P95: '<=', ERROR_RATE: '<=', TPS: '>=' };

/** 화면은 95% 응답시간을 초로 보인다(§3.9 「분포」 0.1초 단위). 저장은 ms 다 */
export function 화면값(t: Target): number {
  return t.metric === 'P95' ? t.value / 1000 : t.value;
}

export function 저장값(metric: Target['metric'], 화면: number): number {
  return metric === 'P95' ? Math.round(화면 * 1000) : 화면;
}

/** 다음 단계로 넘어가도 되나. 막는 까닭을 돌려준다 — 버튼을 잠그지 않고 누르면 까닭을 보인다 (SPEC §8.2) */
export function 넘길까닭(단계: 1 | 2 | 3, 값: { name: string; txCount: number; dummy: boolean; stages: readonly Stage[] }, 언어: 언어): string | null {
  if (단계 === 1) {
    if (값.name.trim() === '') return t('시나리오 이름을 적어 주세요', 언어);
    if (값.txCount === 0 && !값.dummy) return t('트랜잭션이 하나도 없습니다. 가져오거나 추가해 주세요', 언어);
  }
  if (단계 === 2 && 최대목표(값.stages) === 0) return t('가상 사용자가 0명입니다. 최대 가상 사용자를 적어 주세요', 언어);
  return null;
}
