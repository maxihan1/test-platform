// 배포 스모크 보류 댓글 — 스모크 실패와 테스트 데이터 준비 실패를 가르는지 본다 (도메인/BTS §3.12 「새 기능 바퀴」 4)

import { describe, expect, it } from 'vitest';

import { 보류글 } from './holdComment.js';

describe('보류글', () => {
  it('스모크만 깨졌으면 지금 댓글 그대로다', () => {
    expect(보류글('b1', ['XBNA'], [])).toBe(
      '스모크 실패 — 보류 · 빌드 b1\n스모크가 실패한 애플리케이션: XBNA\n이슈는 「QA 요청」에 그대로 두고 다음 배포에서 다시 확인합니다',
    );
  });

  it('준비만 실패했으면 머리가 「테스트 데이터 준비 실패 — 보류」이고 애플리케이션마다 까닭 한 줄이다', () => {
    expect(보류글('b2', [], [{ prefix: 'MTW', note: 'HTTP 500 · seed failed' }, { prefix: 'MTA', note: null }]).split('\n')).toEqual([
      '테스트 데이터 준비 실패 — 보류 · 빌드 b2',
      '테스트 데이터 준비 실패: MTW · HTTP 500 · seed failed',
      '테스트 데이터 준비 실패: MTA',
      '이슈는 「QA 요청」에 그대로 두고 다음 배포에서 다시 확인합니다',
    ]);
  });

  it('섞이면 머리는 스모크 실패이고 준비 실패 줄만 까닭을 단다', () => {
    expect(보류글('b3', ['XBNA'], [{ prefix: 'MTW', note: '시간 초과 120초' }]).split('\n').slice(0, 3)).toEqual([
      '스모크 실패 — 보류 · 빌드 b3',
      '스모크가 실패한 애플리케이션: XBNA',
      '테스트 데이터 준비 실패: MTW · 시간 초과 120초',
    ]);
  });
});
