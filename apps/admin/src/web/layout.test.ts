import { describe, expect, it } from 'vitest';

import type { RunSummary, ServiceRow, User } from './api.js';
import { 고른서비스, 빈띠사유, 알림줄, 자리목록, 지금자리, 탭제목 } from './layout.js';

const 결제: ServiceRow = {
  id: 1,
  prefix: 'PAY',
  name: '결제 서비스',
  color: '#667788',
  envs: [{ env: 'qa', baseUrl: 'https://qa.pay.test' }],
  hasSlackWebhook: true,
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
};
const 회원: ServiceRow = {
  id: 2,
  prefix: 'MEM',
  name: '회원 서비스',
  color: '#556677',
  envs: [],
  hasSlackWebhook: false,
  permissions: { cases: 'read', runs: 'read', authoring: 'read' },
};

// 케이스는 못 보고 작성·실행만 본다
const 정산: ServiceRow = { ...회원, id: 3, prefix: 'SET', name: '정산 서비스', permissions: { cases: 'none', runs: 'read', authoring: 'write' } };

function 사람(role: User['role'], services: ServiceRow[], dashboard: User['dashboard'] = 'read'): User {
  return { username: 'kim', displayName: '김철수', role, dashboard, mustChangePassword: false, services };
}

const 운영 = 사람('admin', [결제]);
const 김 = 사람('member', [결제, 회원, 정산]);

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
  const 이름들 = (user: User, prefix: string | null) => 자리목록(user, prefix, 'ko').map((자리) => 자리.이름);

  it('설정은 운영 계정에게만 뜬다. 흐리게가 아니라 아예 없다', () => {
    expect(이름들(운영, 'PAY')).toEqual(['테스트 케이스', '테스트 작성', 'E2E 시나리오', '실행 기록', '그래프', '설정']);
  });

  it('운영이 아닌 사람에게 설정 자리는 없다', () => {
    expect(이름들(김, 'PAY')).toEqual(['테스트 케이스', '테스트 작성', 'E2E 시나리오', '실행 기록', '그래프']);
    expect(이름들(김, 'MEM')).toEqual(['테스트 케이스', '테스트 작성', 'E2E 시나리오', '실행 기록', '그래프']);
  });

  it('고른 서비스에서 none 인 기능은 자리가 없다. 서비스를 바꾸면 자리도 바뀐다', () => {
    expect(이름들(김, 'SET')).toEqual(['테스트 작성', 'E2E 시나리오', '실행 기록', '그래프']);
    const 작성없음 = 사람('member', [{ ...회원, permissions: { cases: 'read', runs: 'read', authoring: 'none' } }]);
    expect(이름들(작성없음, 'MEM')).toEqual(['테스트 케이스', 'E2E 시나리오', '실행 기록', '그래프']);
  });

  // 시나리오는 실행 칸을 쓴다 (도메인/시나리오 §7) — 실행이 none 이면 만드는 곳도 돌린 기록도 없다
  it('E2E 시나리오 자리는 실행 칸을 본다', () => {
    const 실행없음 = 사람('member', [{ ...회원, permissions: { cases: 'read', runs: 'none', authoring: 'read' } }]);
    expect(이름들(실행없음, 'MEM')).toEqual(['테스트 케이스', '테스트 작성', '그래프']);
  });

  it('그래프는 사람의 대시보드 칸을 본다. 서비스와 상관없다', () => {
    const 대시보드없음 = 사람('member', [결제], 'none');
    expect(이름들(대시보드없음, 'PAY')).toEqual(['테스트 케이스', '테스트 작성', 'E2E 시나리오', '실행 기록']);
  });

  it('넷 다 none 이면 자리가 하나도 없다', () => {
    expect(자리목록(사람('member', [], 'none'), null, 'ko')).toEqual([]);
  });

  it('작성 상세를 열어도 밑줄은 작성 자리에 있다. 상세는 그 목록에서 들어온 자리다', () => {
    expect(지금자리('authoring', '#/cases')).toBe('#/authoring');
    expect(지금자리('authoringItem', '#/cases')).toBe('#/authoring');
  });

  it('실행 결과와 항목 상세도 같은 규칙이다', () => {
    expect(지금자리('run', '#/cases')).toBe('#/runs');
    expect(지금자리('item', '#/cases')).toBe('#/runs');
  });

  it('비밀번호 변경 화면에서는 어느 자리에도 밑줄이 없다', () => {
    const 자리들 = 자리목록(사람('admin', [결제]), 'PAY', 'ko').map((자리) => 자리.해시);
    expect(자리들).not.toContain(지금자리('password', '#/cases'));
  });

  it('모르는 자리는 집으로 보낸다. 집은 권한으로 고른 자리다', () => {
    expect(지금자리('unknown', '#/cases')).toBe('#/cases');
    expect(지금자리('unknown', '#/authoring')).toBe('#/authoring');
  });

  // 사이드바 하위 메뉴 — 늘 펼쳐 둔다 (화면공통 §8 「자리 목록」 · 2026-10-02 사용자 시안 A · PR #132)
  it('테스트 케이스와 실행 기록이 UI 테스트 · 기능 테스트 하위를 품는다', () => {
    const 자리들 = 자리목록(김, 'MEM', 'ko');
    const 하위 = (이름: string) => 자리들.find((자리) => 자리.이름 === 이름)?.하위?.map((h) => [h.이름, h.해시, h.라벨]);
    expect(하위('테스트 케이스')).toEqual([
      ['UI 테스트', '#/cases/ui', '테스트 케이스 · UI 테스트'],
      ['기능 테스트', '#/cases/fn', '테스트 케이스 · 기능 테스트'],
    ]);
    // E2E 는 실행 기록에만 있다 — 케이스 목록에는 시나리오가 없다 (도메인/실행 §8.7)
    expect(하위('실행 기록')).toEqual([
      ['UI 테스트', '#/runs/ui', '실행 기록 · UI 테스트'],
      ['기능 테스트', '#/runs/fn', '실행 기록 · 기능 테스트'],
      ['E2E', '#/runs/e2e', '실행 기록 · E2E'],
    ]);
    expect(자리들.find((자리) => 자리.이름 === '테스트 작성')?.하위).toBeUndefined();
    expect(자리들.find((자리) => 자리.이름 === 'E2E 시나리오')?.하위).toBeUndefined();
  });

  it('목록은 종류까지 지금 자리다 · 종류를 모르는 상세는 묶음이다', () => {
    expect(지금자리('cases', '#/cases', 'UI')).toBe('#/cases/ui');
    expect(지금자리('cases', '#/cases', 'FN')).toBe('#/cases/fn');
    expect(지금자리('runs', '#/cases', 'UI')).toBe('#/runs/ui');
    expect(지금자리('runs', '#/cases', 'E2E')).toBe('#/runs/e2e');
    expect(지금자리('setup', '#/cases')).toBe('#/cases');
  });

  it('시나리오 한 건과 새 시나리오는 E2E 시나리오 자리다. 목록에서 들어온 자리다', () => {
    expect(지금자리('scenarios', '#/cases')).toBe('#/scenarios');
    expect(지금자리('scenarioNew', '#/cases')).toBe('#/scenarios');
    expect(지금자리('scenario', '#/cases')).toBe('#/scenarios');
  });

  it('그래프는 Grafana 라 바깥으로 나간다', () => {
    const 그래프 = 자리목록(김, 'MEM', 'ko').find((자리) => 자리.이름 === '그래프');
    expect(그래프?.바깥).toBe(true);
  });

  it('Grafana 는 같은 서버의 /grafana/ 다 — admin 이 로그인을 보고 대신 연다 (도메인/인증 §7)', () => {
    const 그래프 = 자리목록(김, 'MEM', 'ko').find((자리) => 자리.이름 === '그래프');
    expect(그래프?.해시).toBe('/grafana/');
  });

  it('케이스가 집이다. 이 도구의 일은 무엇을 돌릴까에서 시작한다', () => {
    expect(자리목록(김, 'MEM', 'ko')[0]?.해시).toBe('#/cases');
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
  it('운영 계정은 스스로 풀 수 있다고 알려준다', () => {
    const 사유 = 빈띠사유(사람('admin', []), null, 'ko');
    expect(사유?.무엇).toBe('아직 배정받은 서비스가 없습니다');
    expect(사유?.다음).toContain('설정');
  });

  it('나머지 사람에게는 누구에게 요청할지 알려준다', () => {
    const 사유 = 빈띠사유(사람('member', []), null, 'ko');
    expect(사유?.다음).toContain('요청');
  });

  it('배정이 있으면 사유가 없다', () => {
    expect(빈띠사유(사람('member', [결제]), 'PAY', 'ko')).toBe(null);
  });

  it('설정 화면은 덮지 않는다. 가라고 한 곳이 막히면 아무것도 못 한다', () => {
    // 2026-09-19 실측 — 안내가 「설정에서 자기 자신을 배정하세요」인데 설정을 눌러도
    // 같은 안내가 떴다. 서비스가 0개인 첫 운영자는 영영 빠져나올 수 없었다
    expect(빈띠사유(사람('admin', []), null, 'ko', '#/settings')).toBe(null);
  });

  it('비밀번호 변경 화면은 누구에게도 덮지 않는다. 배정과 상관없이 자기 비밀번호는 바꾼다', () => {
    const 자리 = 지금자리('password', '#/cases');
    expect(빈띠사유(사람('admin', []), null, 'ko', 자리)).toBe(null);
    expect(빈띠사유(사람('member', []), null, 'ko', 자리)).toBe(null);
    expect(빈띠사유(사람('member', [], 'none'), null, 'ko', 자리)).toBe(null);
  });

  it('설정을 못 여는 사람에게는 설정 자리에서도 사유를 보여준다', () => {
    // 그 사람에게는 설정이 길이 아니다. 비워 두면 왜 빈지 알 수 없다
    expect(빈띠사유(사람('member', []), null, 'ko', '#/settings')?.다음).toContain('요청');
  });

  it('넷 다 none 이면 권한이 없다고 먼저 알린다. 서비스 0건 안내보다 앞선다', () => {
    const 사유 = 빈띠사유(사람('member', [], 'none'), null, 'ko');
    expect(사유?.무엇).toBe('권한을 받지 않았습니다. 운영자에게 요청하세요');
  });

  it('대시보드만 있어도 권한 없음이 아니다. 서비스 0건 안내가 뜬다', () => {
    expect(빈띠사유(사람('member', [], 'read'), null, 'ko')?.무엇).toBe('아직 배정받은 서비스가 없습니다');
  });

  it('자리를 안 주면 지금까지처럼 군다', () => {
    expect(빈띠사유(사람('admin', []), null, 'ko')?.무엇).toBe('아직 배정받은 서비스가 없습니다');
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

  it('미확정이 있으면 확정 집계 뒤에 미확정 묶음을 붙인다', () => {
    const 섞인것 = { ...실행(2127, 'FINISHED', 7, 0), finishedAt: new Date().toISOString() };
    섞인것.counts = { total: 7, pass: 5, fail: 0, na: 0, running: 0, unconfirmed: { total: 2, pass: 1, fail: 1, na: 0 } };
    expect(알림줄([섞인것], 'ko', new Set())?.글).toBe('RUN 2127 이 끝났습니다 · 5 통과 · 미확정 2(통과 1 · 실패 1)');
  });

  it('미확정만 돌린 실행은 0 통과를 적지 않는다 — 판정이 없는 실행이다', () => {
    const 미확정만 = { ...실행(2128, 'FINISHED', 2, 0), finishedAt: new Date().toISOString() };
    미확정만.counts = { total: 2, pass: 0, fail: 0, na: 0, running: 0, unconfirmed: { total: 2, pass: 2, fail: 0, na: 0 } };
    expect(알림줄([미확정만], 'ko', new Set())?.글).toBe('RUN 2128 이 끝났습니다 · 미확정 2(통과 2)');
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
