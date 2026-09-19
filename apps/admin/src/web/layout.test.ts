import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RunSummary, ServiceRow, User } from './api.js';
import { 고른서비스, 빈띠사유, 알림줄, 자리목록, 탭제목 } from './layout.js';

// 그래프 자리가 Grafana 주소를 만들 때 location 을 읽는다. jsdom 을 설치하지 않았으므로
// api.test.ts 와 같은 방식으로 가짜를 끼운다
beforeEach(() => {
  vi.stubGlobal('location', { protocol: 'https:', hostname: 'qa.example.com' });
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
    expect(탭제목(결제)).toBe('결제 서비스 · 테스트 플랫폼');
  });

  it('고른 서비스가 없으면 제품 이름만 쓴다', () => {
    expect(탭제목(null)).toBe('테스트 플랫폼');
  });
});

describe('자리 넷', () => {
  it('설정은 운영 등급에게만 뜬다. 흐리게가 아니라 아예 없다', () => {
    expect(자리목록('admin').map((자리) => 자리.이름)).toEqual(['케이스', '실행 기록', '그래프', '설정']);
  });

  it('실행까지 등급에게 설정 자리는 없다', () => {
    expect(자리목록('operator').map((자리) => 자리.이름)).toEqual(['케이스', '실행 기록', '그래프']);
  });

  it('보기만 등급에게도 설정 자리는 없다', () => {
    expect(자리목록('viewer').map((자리) => 자리.이름)).toEqual(['케이스', '실행 기록', '그래프']);
  });

  it('그래프는 Grafana 라 바깥으로 나간다', () => {
    const 그래프 = 자리목록('viewer').find((자리) => 자리.이름 === '그래프');
    expect(그래프?.바깥).toBe(true);
  });

  it('Grafana 는 admin 과 다른 포트다. 같은 호스트의 3001 로 보낸다', () => {
    const 그래프 = 자리목록('viewer').find((자리) => 자리.이름 === '그래프');
    expect(그래프?.해시).toBe('https://qa.example.com:3001');
  });

  it('케이스가 집이다. 이 도구의 일은 무엇을 돌릴까에서 시작한다', () => {
    expect(자리목록('viewer')[0]?.해시).toBe('#/cases');
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
    const 사유 = 빈띠사유(사람('admin', []));
    expect(사유?.무엇).toBe('아직 배정받은 서비스가 없습니다');
    expect(사유?.다음).toContain('설정');
  });

  it('나머지 등급에게는 누구에게 요청할지 알려준다', () => {
    const 사유 = 빈띠사유(사람('viewer', []));
    expect(사유?.다음).toContain('요청');
  });

  it('배정이 있으면 사유가 없다', () => {
    expect(빈띠사유(사람('viewer', [결제]))).toBe(null);
  });
});

describe('알림 줄', () => {
  it('도는 실행이 있으면 한 줄로 알린다. 몇 건 중 몇 건인지 같이 적는다', () => {
    const 줄 = 알림줄([실행(2113, 'RUNNING', 40, 28)]);
    expect(줄?.runId).toBe(2113);
    expect(줄?.글).toBe('RUN 2113 이 도는 중입니다  12/40');
  });

  it('도는 실행이 없으면 줄 자체가 없다. 빈 줄을 자리만 잡아 두지 않는다', () => {
    expect(알림줄([실행(2113, 'FINISHED', 40, 0)])).toBe(null);
  });

  it('중단된 실행은 도는 중이 아니다', () => {
    expect(알림줄([실행(2113, 'ABORTED', 40, 12)])).toBe(null);
  });

  it('실행이 하나도 없으면 줄이 없다', () => {
    expect(알림줄([])).toBe(null);
  });

  it('도는 것이 여럿이면 가장 최근 것을 알린다', () => {
    const 줄 = 알림줄([실행(2115, 'RUNNING', 10, 3), 실행(2113, 'RUNNING', 40, 28)]);
    expect(줄?.runId).toBe(2115);
  });
});
