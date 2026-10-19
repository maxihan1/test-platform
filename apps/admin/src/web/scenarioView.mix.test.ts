import type { ScenarioPart } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import { 단계앱, 서버선택지, 섞였나, 케이스접두사 } from './scenarioView.js';

const 케이스 = (tcId: string): ScenarioPart => ({ kind: 'case', tcId, params: {}, expected: {}, skipSteps: [] });
const API = (service?: string): ScenarioPart => ({ kind: 'api', method: 'GET', path: '/x', expectStatus: 200, ...(service === undefined ? {} : { service }) });

describe('단계 애플리케이션 (도메인/시나리오 §3.7 결정 13)', () => {
  it('케이스는 번호 앞 글자, API 호출은 service 나 시작 애플리케이션, 그 밖은 null', () => {
    expect(케이스접두사('MKT-FN-001')).toBe('MKT');
    expect(단계앱(케이스('ADM-FN-002'), 'MKT')).toBe('ADM');
    expect(단계앱(API(), 'MKT')).toBe('MKT');
    expect(단계앱(API('ADM'), 'MKT')).toBe('ADM');
    expect(단계앱({ kind: 'wait', ms: 1 }, 'MKT')).toBeNull();
  });

  it('시작 애플리케이션 밖의 단계가 하나라도 있어야 섞인 것이다', () => {
    expect(섞였나([케이스('MKT-FN-001'), API(), { kind: 'wait', ms: 1 }], 'MKT')).toBe(false);
    expect(섞였나([케이스('MKT-FN-001'), API('ADM')], 'MKT')).toBe(true);
    expect(섞였나([케이스('ADM-FN-001')], 'MKT')).toBe(true);
  });
});

describe('대상 서버 선택지', () => {
  const 앱 = (prefix: string, ...envs: string[]) => ({ prefix, name: prefix, color: '#000', envs: envs.map((env) => ({ env })) });
  const 앱들 = [앱('MKT', 'stg', 'qa', 'prod'), 앱('ADM', 'stg', 'prod'), 앱('PAY', 'stg')];

  it('시작 애플리케이션만 쓰면 그 서버 이름이 전부 열려 있다', () => {
    expect(서버선택지(앱들, 'MKT', [케이스('MKT-FN-001')])).toEqual([
      { env: 'stg', 없는곳: [] },
      { env: 'qa', 없는곳: [] },
      { env: 'prod', 없는곳: [] },
    ]);
  });

  it('든 다른 애플리케이션에 그 이름이 없으면 없는 곳의 접두사를 알린다. 안 든 애플리케이션은 안 본다', () => {
    expect(서버선택지(앱들, 'MKT', [케이스('MKT-FN-001'), 케이스('ADM-FN-001')])).toEqual([
      { env: 'stg', 없는곳: [] },
      { env: 'qa', 없는곳: ['ADM'] },
      { env: 'prod', 없는곳: [] },
    ]);
    expect(서버선택지(앱들, 'MKT', [케이스('ADM-FN-001'), API('PAY')]).map((s) => [s.env, s.없는곳])).toEqual([
      ['stg', []],
      ['qa', ['ADM', 'PAY']],
      ['prod', ['PAY']],
    ]);
  });
});
