// 학습 세션 인수인계 — 컨텍스트로 바뀐 다음 세션 맨 위에 기계가 모아 싣는 줄
import { describe, expect, it } from 'vitest';

import { 인수인계 } from './authoring-learn-handoff.js';

const 줄 = (kind: string, key: string, data: object, belief = 'SEEN') => ({ kind, key, name: 'ㄱ', line: '', learned: { text: 'ㄱ', belief, data } });
const 값기록 = (계획: string, 때: { 초: number; 값: Record<string, number | null> }[]) => ({ 계획, 볼값: [], 간격ms: 2000, 때, 어긋남: null, 화면다름: [] });

describe('인수인계 — 기계가 모은 것', () => {
  it('가장 멀리 간 것 · 최근 회고 셋 · 지금 계획 · 열린 물음 · 안 간 곳 · 게임 지금 상태', () => {
    const 회고 = (n: number, 나아감: number) => (줄('PLAY', `play:2026112600000000${n}-판`, { 까닭: '손', 나아감, 계획: 'trial:첫 맵', 목표: { 값: '웨이브', 기준: 6, 닿은: 3 }, 다음: 'trial:첫 맵' }));
    const 줄들 = [회고(1, 0), 회고(2, 1), 회고(3, 0), 회고(4, 0), 줄('TRIAL', 'trial:첫 맵', {}, 'GUESS'), 줄('STAGE', 'stage:둘째 맵', {}), 줄('ASK', 'ask:가', {}, 'GUESS')] as never;
    const 글 = 인수인계({ 줄들 }, [{ 이름: '20261126000000004-판', 값기록: 값기록('trial:첫 맵', [{ 초: 0, 값: { 웨이브: 3, 나아감: 0 } }]) }], '2026-11-26');
    expect(글[0]).toContain('나아감 1 — play:20261126000000002-판');
    expect(글[1]).toBe('- 최근 회고 3개 (전체 4)');
    expect(글.slice(2, 5).map((x) => x.slice(4).split(' · ')[0])).toEqual(['play:20261126000000002-판', 'play:20261126000000003-판', 'play:20261126000000004-판']);
    expect(글).toContain('- 열린 물음 1: ask:가');
    expect(글).toContain('- 아직 안 간 곳 1: stage:둘째 맵');
    expect(글.at(-1)).toContain('웨이브 3 · 나아감 0');
    expect(인수인계({ 줄들: [] }, [], '2026-11-26')).toEqual([]);
  });
});

