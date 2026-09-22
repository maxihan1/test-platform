import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RunSummary, ServiceRow, User } from './api.js';
import { 고른서비스, 빈띠사유, 알림줄, 자리목록, 탭제목 } from './layout.js';

// 그래프 자리가 Grafana 주소를 만들 때 location 을 읽는다. jsdom 을 설치하지 않았으므로
// api.test.ts 와 같은 방식으로 가짜를 끼운다
beforeEach(() => {
  vi.stubGlobal('location', { protocol: 'https:', hostname: 'qa.example.com' });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const 결제: ServiceRow = {
  id: 1,
  prefix: 'PAY',
  name: '결제 서비스',
  color: '#667788',
  envs: [{ env: 'qa', baseUrl: 'https://qa.pay.test' }],
  hasSlackWebhook: true,
};
const 회원: ServiceRow = {
  id: 2,
  prefix: 'MEM',
  name: '회원 서비스',
  color: '#556677',
  envs: [],
  hasSlackWebhook: false,
};

function 사람(role: User['role'], services: ServiceRow[]): User {
  return { username: 'kim', displayName: '김철수', role, services };
}

function 실행(runId: number, status: string, total: number, running: number): RunSummary {
  return {
    runId,
    title: `RUN ${runId}`,
    triggeredBy: 'kim',
    triggeredByName: '김철수',
    env: 'qa',
    baseUrl: 'https://qa.example.com',
    serviceName: '결제 서비스',
    status,
    startedAt: '2026-09-19T01:00:00.000Z',
    finishedAt: null,
    counts: { total, pass: total - running, fail: 0, na: 0, running },
  };
}

describe('탭 제목', () => {
  it('브라우저 탭에도 서비스 이름이 들어간다. 탭이 여럿일 때는 탭 글자만 보인다', () => {
    expect(탭제목(결제, 'ko')).toBe('결제 서비스 · 테스트 플랫폼');
  });

  it('고른 서비스가 없으면 제품 이름만 쓴다', () => {
    expect(탭제목(null, 'ko')).toBe('테스트 플랫폼');
  });
});

describe('자리 목록', () => {
  it('설정은 운영 등급에게만 뜬다. 흐리게가 아니라 아예 없다', () => {
    expect(자리목록('admin', 'ko').map((자리) => 자리.이름)).toEqual(['테스트 케이스', '테스트 작성', '실행 기록', '그래프', '설정']);
  });

  it('실행까지 등급에게 설정 자리는 없다', () => {
    expect(자리목록('operator', 'ko').map((자리) => 자리.이름)).toEqual(['테스트 케이스', '테스트 작성', '실행 기록', '그래프']);
  });

  it('보기만 등급에게도 설정 자리는 없다', () => {
    expect(자리목록('viewer', 'ko').map((자리) => 자리.이름)).toEqual(['테스트 케이스', '테스트 작성', '실행 기록', '그래프']);
  });

  it('그래프는 Grafana 라 바깥으로 나간다', () => {
    const 그래프 = 자리목록('viewer', 'ko').find((자리) => 자리.이름 === '그래프');
    expect(그래프?.바깥).toBe(true);
  });

  it('Grafana 포트는 빌드할 때 받은 설정값을 따른다', () => {
    vi.stubEnv('VITE_GRAFANA_PORT', '4100');
    const 그래프 = 자리목록('viewer', 'ko').find((자리) => 자리.이름 === '그래프');
    expect(그래프?.해시).toBe('https://qa.example.com:4100');
  });

  it('설정을 안 주면 3001 이다. compose 의 GRAFANA_PORT 기본값과 같은 숫자다', () => {
    const 그래프 = 자리목록('viewer', 'ko').find((자리) => 자리.이름 === '그래프');
    expect(그래프?.해시).toBe('https://qa.example.com:3001');
  });

  it('케이스가 집이다. 이 도구의 일은 무엇을 돌릴까에서 시작한다', () => {
    expect(자리목록('viewer', 'ko')[0]?.해시).toBe('#/cases');
  });
});

describe('고른 서비스', () => {
  it('저장된 접두사가 배정 목록에 있으면 그것을 연다', () => {
    expect(고른서비스('MEM', [결제, 회원])?.prefix).toBe('MEM');
  });

  it('저장된 것이 없으면 첫 번째를 연다', () => {
    expect(고른서비스(null, [결제, 회원])?.prefix).toBe('PAY');
  });

  it('배정이 빠진 서비스가 저장돼 있으면 남의 것을 열지 않고 첫 번째로 돌아간다', () => {
    expect(고른서비스('PAY', [회원])?.prefix).toBe('MEM');
  });

  it('배정받은 것이 하나도 없으면 고를 것이 없다', () => {
    expect(고른서비스('PAY', [])).toBe(null);
  });
});

describe('배정받은 서비스가 없을 때', () => {
  it('운영 등급은 스스로 풀 수 있다고 알려준다', () => {
    const 사유 = 빈띠사유(사람('admin', []), 'ko');
    expect(사유?.무엇).toBe('아직 배정받은 서비스가 없습니다');
    expect(사유?.다음).toContain('설정');
  });

  it('나머지 등급에게는 누구에게 요청할지 알려준다', () => {
    const 사유 = 빈띠사유(사람('viewer', []), 'ko');
    expect(사유?.다음).toContain('요청');
  });

  it('배정이 있으면 사유가 없다', () => {
    expect(빈띠사유(사람('viewer', [결제]), 'ko')).toBe(null);
  });

  it('설정 화면은 덮지 않는다. 가라고 한 곳이 막히면 아무것도 못 한다', () => {
    // 2026-09-19 실측 — 안내가 「설정에서 자기 자신을 배정하세요」인데 설정을 눌러도
    // 같은 안내가 떴다. 서비스가 0개인 첫 운영자는 영영 빠져나올 수 없었다
    expect(빈띠사유(사람('admin', []), 'ko', '#/settings')).toBe(null);
  });

  it('설정을 못 여는 등급에게는 설정 자리에서도 사유를 보여준다', () => {
    // 그 사람에게는 설정이 길이 아니다. 비워 두면 왜 빈지 알 수 없다
    expect(빈띠사유(사람('viewer', []), 'ko', '#/settings')?.다음).toContain('요청');
  });

  it('자리를 안 주면 지금까지처럼 군다', () => {
    expect(빈띠사유(사람('admin', []), 'ko')?.무엇).toBe('아직 배정받은 서비스가 없습니다');
  });
});

describe('알림 줄', () => {
  it('도는 실행이 있으면 한 줄로 알린다. 몇 건 중 몇 건인지 같이 적는다', () => {
    const 줄 = 알림줄([실행(2113, 'RUNNING', 40, 28)], 'ko');
    expect(줄?.runId).toBe(2113);
    expect(줄?.글).toBe('RUN 2113 이 진행 중입니다  12/40');
  });

  it('도는 실행이 없으면 줄 자체가 없다. 빈 줄을 자리만 잡아 두지 않는다', () => {
    expect(알림줄([실행(2113, 'FINISHED', 40, 0)], 'ko')).toBe(null);
  });

  it('중단된 실행은 도는 중이 아니다', () => {
    expect(알림줄([실행(2113, 'ABORTED', 40, 12)], 'ko')).toBe(null);
  });

  it('실행이 하나도 없으면 줄이 없다', () => {
    expect(알림줄([], 'ko')).toBe(null);
  });

  it('도는 것이 없고 끝난 지 얼마 안 된 것이 있으면 끝났다고 알린다 (SPEC §8.9)', () => {
    const 끝난것 = { ...실행(2120, 'FINISHED', 10, 0), finishedAt: new Date().toISOString() };
    끝난것.counts = { total: 10, pass: 8, fail: 1, na: 1, running: 0 };
    const 줄 = 알림줄([끝난것], 'ko', new Set());
    expect(줄?.runId).toBe(2120);
    // 미실행이 있으면 그것도 적는다. SPEC §8.9 의 예시(8 통과 · 1 실패)는 미실행이 0 인 경우다 —
    // 있는데 숨기면 「다 돌았다」로 읽힌다
    expect(줄?.글).toBe('RUN 2120 이 끝났습니다 · 8 통과 · 1 실패 · 1 미실행');
    expect(줄?.끝났나).toBe(true);
  });

  it('실패도 미실행도 없으면 통과만 적는다', () => {
    const 깨끗한것 = { ...실행(2126, 'FINISHED', 5, 0), finishedAt: new Date().toISOString() };
    깨끗한것.counts = { total: 5, pass: 5, fail: 0, na: 0, running: 0 };
    expect(알림줄([깨끗한것], 'ko', new Set())?.글).toBe('RUN 2126 이 끝났습니다 · 5 통과');
  });

  it('중단된 실행은 멈췄다고 알린다. 사람이 멈춘 것도 끝난 것이다', () => {
    const 멈춘것 = { ...실행(2121, 'ABORTED', 10, 0), finishedAt: new Date().toISOString() };
    expect(알림줄([멈춘것], 'ko', new Set())?.글).toContain('멈췄습니다');
  });

  it('이미 본 알림은 다시 안 뜬다', () => {
    const 끝난것 = { ...실행(2122, 'FINISHED', 10, 0), finishedAt: new Date().toISOString() };
    expect(알림줄([끝난것], 'ko', new Set([2122]))).toBe(null);
  });

  it('도는 것이 있으면 그것을 먼저 알린다. 끝난 소식보다 지금 도는 것이 급하다', () => {
    const 끝난것 = { ...실행(2123, 'FINISHED', 10, 0), finishedAt: new Date().toISOString() };
    const 도는것 = 실행(2124, 'RUNNING', 40, 28);
    expect(알림줄([끝난것, 도는것], 'ko', new Set())?.runId).toBe(2124);
  });

  it('오래전에 끝난 실행은 알리지 않는다. 그것은 기록이지 소식이 아니다', () => {
    const 옛것 = { ...실행(2125, 'FINISHED', 10, 0), finishedAt: '2026-09-01T00:00:00.000Z' };
    expect(알림줄([옛것], 'ko', new Set())).toBe(null);
  });

  it('도는 것이 여럿이면 가장 최근 것을 알린다', () => {
    const 줄 = 알림줄([실행(2115, 'RUNNING', 10, 3), 실행(2113, 'RUNNING', 40, 28)], 'ko');
    expect(줄?.runId).toBe(2115);
  });
});
