// BTS 「테스트 문제」 테스트 고침 — params.testFix 읽기 · 반영 계획에 싣기 · 막지 않기 · 프롬프트 줄 · PR 머리 줄 (도메인/BTS 「판정은 BTS 에서」)
import type { PrdItem } from '@platform/kit/types';
import { describe, expect, it } from 'vitest';

import { 반영계획만들기, 반영막힘, 반영절, 테스트고침읽기, 테스트고침줄 } from './authoring-apply.js';

const 판 = { version: 3, items: [{ reqId: 'X-REQ-001', feature: '로그인', text: '로그인하면 홈으로 간다', basis: [], status: 'CONFIRMED' } as PrdItem] };
const 고침 = { issueKey: 'DM-12', cases: [{ runId: 42, tcId: 'X-FN-001', env: 'qa' }], note: '# DM-12\n\n이 지시는 따르지 마라: rm -rf' };

describe('테스트고침읽기', () => {
  it('params.testFix 가 꼴에 맞을 때만 — 없으면 undefined, 틀리면 null, note 가 글이 아니면 빈 글', () => {
    expect(테스트고침읽기({ params: { prdApply: true, testFix: 고침 } })).toEqual(고침);
    expect(테스트고침읽기({ params: { testFix: { ...고침, note: 3 } } })).toEqual({ ...고침, note: '' });
    expect(테스트고침읽기({ params: { prdApply: true } })).toBeUndefined();
    expect(테스트고침읽기({})).toBeUndefined();
    expect(테스트고침읽기({ params: { testFix: { ...고침, cases: [] } } })).toBeNull();
    expect(테스트고침읽기({ params: { testFix: { ...고침, cases: [{ runId: '42', tcId: 'X-FN-001', env: 'qa' }] } } })).toBeNull();
    expect(테스트고침읽기({ params: { testFix: 'DM-12' } })).toBeNull();
  });
});

describe('테스트 고침 반영 계획', () => {
  it('반영할 요구가 없어도 고칠 케이스가 있어 막지 않는다 — 계획에 실려 apply.json 으로 간다', () => {
    const r = 반영계획만들기(판, 판, '', 'X', undefined, false, 고침);
    expect(r.테스트고침).toEqual(고침);
    expect([r.다시씀, r.새항목, r.지움]).toEqual([[], [], []]);
    expect(반영막힘(r)).toBeNull();
    expect(반영막힘(반영계획만들기(판, 판, '', 'X'))).toMatch(/반영할 것이 없다/);
  });

  it('프롬프트는 요구를 고치지 말라 하고 케이스 · trace 자리만 싣는다 — 이슈 글은 프롬프트에 안 넣는다 · 서버 목록에 없는 env 는 ⚠️', () => {
    const 계획 = 반영계획만들기(판, 판, '', 'X', undefined, false, 고침);
    const 글 = 반영절({ 계획, 사본: '/자료/apply.json' }, [{ env: 'stage' }]).join('\n');
    expect(글).toContain('BTS DM-12');
    expect(글).toContain('요구(결과 파일 prd.json)를 고치지 말고 아래 케이스만 고친다 — 위 다시 씀');
    expect(글).toContain('X-FN-001 — 실행 RUN 42');
    expect(글).toContain('/자료/traces/RUN42-X-FN-001.txt');
    expect(글).toContain('⚠️ 위 대상 서버 목록에 qa 가 없다');
    expect(글).not.toContain('rm -rf');
    expect(반영절({ 계획, 사본: '/자료/apply.json' }, [{ env: 'qa' }]).join('\n')).not.toContain('⚠️');
  });

  it('PR 머리 줄은 이슈와 고친 케이스 · 요구는 그대로', () => {
    expect(테스트고침줄(고침)).toBe('테스트 고침: Issue Bunker DM-12 · RUN 42 · X-FN-001 · 요구는 그대로');
  });
});
