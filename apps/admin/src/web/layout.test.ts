import { describe, expect, it } from 'vitest';

import type { ServiceRow, User } from './api.js';
import { 고른서비스, 대시보드재료, 배정서비스접두사, 배정프로젝트들, 빈띠사유, 자리목록, 지금자리, 탭제목, 프로젝트물을까, 프로젝트서비스들 } from './layout.js';

const 결제: ServiceRow = {
  id: 1,
  prefix: 'PAY',
  name: '결제 애플리케이션',
  color: '#667788',
  projectId: 10,
  projectName: '데모마켓',
  envs: [{ env: 'qa', baseUrl: 'https://qa.pay.test' }],
  hasSlackWebhook: true,
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
};
const 회원: ServiceRow = {
  id: 2,
  prefix: 'MEM',
  name: '회원 애플리케이션',
  color: '#556677',
  projectId: 10,
  projectName: '데모마켓',
  envs: [],
  hasSlackWebhook: false,
  permissions: { cases: 'read', runs: 'read', authoring: 'read' },
};

// 케이스는 못 보고 작성·실행만 본다
const 정산: ServiceRow = { ...회원, id: 3, prefix: 'SET', name: '정산 애플리케이션', projectId: 20, projectName: '사내 포털', permissions: { cases: 'none', runs: 'read', authoring: 'write' } };

function 사람(role: User['role'], services: ServiceRow[], dashboard: User['dashboard'] = 'read'): User {
  return { username: 'kim', displayName: '김철수', role, dashboard, mustChangePassword: false, services };
}

const 운영 = 사람('admin', [결제]);
const 김 = 사람('member', [결제, 회원, 정산]);

describe('프로젝트', () => {
  it('배정받은 애플리케이션에서 프로젝트를 뽑는다. 같은 프로젝트는 한 번만, 처음 나온 순서대로', () => {
    expect(배정프로젝트들([결제, 정산, 회원])).toEqual([
      { id: 10, name: '데모마켓' },
      { id: 20, name: '사내 포털' },
    ]);
  });

  it('배정이 없으면 프로젝트도 없다', () => {
    expect(배정프로젝트들([])).toEqual([]);
  });

  it('프로젝트를 고르면 그 안의 애플리케이션만 남는다', () => {
    expect(프로젝트서비스들(10, [결제, 정산, 회원]).map((it) => it.prefix)).toEqual(['PAY', 'MEM']);
    expect(프로젝트서비스들(99, [결제])).toEqual([]);
  });
});

describe('로그인 직후 프로젝트 묻기', () => {
  it('프로젝트가 둘 이상이고 막 로그인했으면 묻는다', () => {
    expect(프로젝트물을까(null, [결제, 정산])).toBe(true);
  });

  it('프로젝트가 하나뿐이면 고를 것이 없어 묻지 않는다', () => {
    expect(프로젝트물을까(null, [결제, 회원])).toBe(false);
    expect(프로젝트물을까(null, [])).toBe(false);
  });

  it('끊겼다 돌아온 로그인은 가려던 자리로 간다 — 다시 묻지 않는다', () => {
    expect(프로젝트물을까('#/runs', [결제, 정산])).toBe(false);
  });
});

describe('탭 제목', () => {
  it('브라우저 탭에도 애플리케이션 이름이 들어간다. 탭이 여럿일 때는 탭 글자만 보인다', () => {
    expect(탭제목(결제)).toBe('결제 애플리케이션 · Test Commander');
  });

  it('고른 애플리케이션이 없으면 제품 이름만 쓴다', () => {
    expect(탭제목(null)).toBe('Test Commander');
  });
});

describe('자리 목록', () => {
  const 이름들 = (user: User, prefix: string | null) => 자리목록(user, prefix, 'ko').map((자리) => 자리.이름);

  it('설정은 운영 계정에게만 뜬다. 흐리게가 아니라 아예 없다', () => {
    expect(이름들(운영, 'PAY')).toEqual(['대시보드', 'PRD 관리', '테스트 작성', '테스트 스크립트', 'E2E 시나리오', '실행 기록', '성능 테스트', '그래프(Grafana)', '설정']);
  });

  it('운영이 아닌 사람에게 설정 자리는 없다', () => {
    expect(이름들(김, 'PAY')).toEqual(['대시보드', 'PRD 관리', '테스트 작성', '테스트 스크립트', 'E2E 시나리오', '실행 기록', '성능 테스트', '그래프(Grafana)']);
    expect(이름들(김, 'MEM')).toEqual(['대시보드', 'PRD 관리', '테스트 작성', '테스트 스크립트', 'E2E 시나리오', '실행 기록', '성능 테스트', '그래프(Grafana)']);
  });

  it('고른 애플리케이션에서 none 인 기능은 자리가 없다. 애플리케이션을 바꾸면 자리도 바뀐다', () => {
    expect(이름들(김, 'SET')).toEqual(['대시보드', 'PRD 관리', '테스트 작성', 'E2E 시나리오', '실행 기록', '성능 테스트', '그래프(Grafana)']);
    const 작성없음 = 사람('member', [{ ...회원, permissions: { cases: 'read', runs: 'read', authoring: 'none' } }]);
    expect(이름들(작성없음, 'MEM')).toEqual(['대시보드', '테스트 스크립트', 'E2E 시나리오', '실행 기록', '성능 테스트', '그래프(Grafana)']);
  });

  // 시나리오는 실행 칸을 쓴다 (도메인/시나리오 §7) — 실행이 none 이면 만드는 곳도 돌린 기록도 없다
  it('E2E 시나리오 자리는 실행 칸을 본다', () => {
    const 실행없음 = 사람('member', [{ ...회원, permissions: { cases: 'read', runs: 'none', authoring: 'read' } }]);
    expect(이름들(실행없음, 'MEM')).toEqual(['PRD 관리', '테스트 작성', '테스트 스크립트', '그래프(Grafana)']);
  });

  it('그래프는 사람의 대시보드 칸을 본다. 애플리케이션과 상관없다', () => {
    const 대시보드없음 = 사람('member', [결제], 'none');
    expect(이름들(대시보드없음, 'PAY')).toEqual(['대시보드', 'PRD 관리', '테스트 작성', '테스트 스크립트', 'E2E 시나리오', '실행 기록', '성능 테스트']);
  });

  // 대시보드는 배정 서비스 전체의 실행 칸을 본다 — 고른 서비스가 아니다 (화면공통 §8 · 도메인/리포팅 §8.12)
  it('대시보드는 실행 read 애플리케이션이 하나라도 있으면 맨 위에 뜬다. 고른 애플리케이션이 달라도 같다', () => {
    const 실행없는쪽 = { ...회원, permissions: { cases: 'read' as const, runs: 'none' as const, authoring: 'none' as const } };
    const 사람둘 = 사람('member', [실행없는쪽, 결제]);
    expect(자리목록(사람둘, 'MEM', 'ko')[0]).toMatchObject({ 이름: '대시보드', 해시: '#/dashboard', 아이콘: 'dashboard' });
    expect(이름들(사람둘, 'MEM')).toEqual(['대시보드', '테스트 스크립트', '그래프(Grafana)']);
  });

  it('실행 read 애플리케이션이 없으면 대시보드 자리가 없다', () => {
    const 실행없음 = 사람('member', [{ ...회원, permissions: { cases: 'read', runs: 'none', authoring: 'read' } }]);
    expect(이름들(실행없음, 'MEM')).not.toContain('대시보드');
  });

  it('넷 다 none 이면 자리가 하나도 없다', () => {
    expect(자리목록(사람('member', [], 'none'), null, 'ko')).toEqual([]);
  });

  it('작성 상세를 열어도 밑줄은 작성 자리에 있다. 상세는 그 목록에서 들어온 자리다', () => {
    expect(지금자리('authoring', '#/cases')).toBe('#/authoring');
    expect(지금자리('authoringItem', '#/cases')).toBe('#/authoring');
  });

  it('PRD 관리 자리는 작성 바로 앞이고 밑줄도 제 자리에 간다', () => {
    expect(자리목록(김, 'MEM', 'ko').find((자리) => 자리.해시 === '#/prd')).toMatchObject({ 이름: 'PRD 관리', 아이콘: 'prd' });
    expect(지금자리('prd', '#/cases')).toBe('#/prd');
  });

  it('PRD 관리 하위는 요구사항 · 종류의 가이드 둘이고 가이드 화면에서는 가이드에 밑줄이 간다', () => {
    expect(자리목록(김, 'MEM', 'ko').find((자리) => 자리.해시 === '#/prd')?.하위).toEqual([
      { 이름: '요구사항', 해시: '#/prd', 라벨: 'PRD 관리 · 요구사항' },
      { 이름: '웹 가이드', 해시: '#/prd/guide', 라벨: 'PRD 관리 · 웹 가이드' },
    ]);
    expect(지금자리('prdGuide', '#/cases')).toBe('#/prd/guide');
  });

  it('성능 테스트 하위는 시나리오 · 페이지 성능 · 실행 기록 차례다 (웹)', () => {
    expect(자리목록(김, 'MEM', 'ko').find((자리) => 자리.이름 === '성능 테스트')?.하위).toEqual([
      { 이름: '부하 테스트', 해시: '#/perf/scenarios', 라벨: '성능 테스트 · 부하 테스트' },
      { 이름: '페이지 성능', 해시: '#/perf/pages', 라벨: '성능 테스트 · 페이지 성능' },
      { 이름: '실행 기록', 해시: '#/perf/runs', 라벨: '성능 테스트 · 실행 기록' },
    ]);
  });

  it('Android 앱 · API 애플리케이션에는 페이지 성능이 없고 부하 테스트 · 실행 기록은 늘 있다', () => {
    const 앱 = { ...회원, kind: 'APP' as const };
    const API = { ...결제, kind: 'API' as const };
    const 하위해시 = (user: User, prefix: string) => 자리목록(user, prefix, 'ko').find((자리) => 자리.이름 === '성능 테스트')?.하위?.map((it) => it.해시);
    expect(하위해시(사람('member', [앱]), 'MEM')).toEqual(['#/perf/scenarios', '#/perf/devices', '#/perf/runs']);
    expect(하위해시(사람('member', [API]), 'PAY')).toEqual(['#/perf/scenarios', '#/perf/runs']);
    // 웹을 고르면 같은 사람에게도 선다 — 고른 애플리케이션의 종류를 본다
    expect(하위해시(사람('member', [앱, 결제]), 'PAY')).toContain('#/perf/pages');
  });

  it('기기 성능은 Android 앱 · 게임에만 선다. 웹 · API 에는 없다. 자리는 페이지 성능 다음 · 실행 기록 앞이다', () => {
    const 하위 = (kind: ServiceRow['kind']) => 자리목록(사람('member', [{ ...결제, kind }]), 'PAY', 'ko').find((자리) => 자리.이름 === '성능 테스트')?.하위;
    expect(하위('SCREEN')?.map((it) => it.해시)).toEqual(['#/perf/scenarios', '#/perf/pages', '#/perf/runs']);
    expect(하위('APP')?.find((it) => it.해시 === '#/perf/devices')).toEqual({ 이름: '앱 성능', 해시: '#/perf/devices', 라벨: '성능 테스트 · 앱 성능' });
    expect(하위('GAME')?.find((it) => it.해시 === '#/perf/devices')?.이름).toBe('게임 성능');
    expect(하위('API')?.map((it) => it.해시)).toEqual(['#/perf/scenarios', '#/perf/runs']);
    expect(지금자리('perfDevices', '#/cases')).toBe('#/perf/devices');
  });

  it('API 애플리케이션이라도 작성 칸이 없으면 PRD 관리가 없고 실행 기록 묶음은 그대로다', () => {
    const API작성없음 = { ...결제, kind: 'API' as const, permissions: { cases: 'read' as const, runs: 'read' as const, authoring: 'none' as const } };
    const 이름들 = 자리목록(사람('member', [API작성없음]), 'PAY', 'ko').map((자리) => 자리.이름);
    expect(이름들).not.toContain('PRD 관리');
    expect(이름들).toContain('실행 기록');
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
  // 묶음을 누르면 기능 화면이 열린다 — 첫 하위가 기능이어야 누른 자리와 열린 화면이 맞는다 (2026-10-20 사용자)
  it('테스트 스크립트와 실행 기록이 기능 테스트 · UI 테스트 하위를 품는다', () => {
    const 자리들 = 자리목록(김, 'MEM', 'ko');
    const 하위 = (이름: string) => 자리들.find((자리) => 자리.이름 === 이름)?.하위?.map((h) => [h.이름, h.해시, h.라벨]);
    expect(하위('테스트 스크립트')).toEqual([
      ['기능 테스트', '#/cases/fn', '테스트 스크립트 · 기능 테스트'],
      ['UI 테스트', '#/cases/ui', '테스트 스크립트 · UI 테스트'],
    ]);
    // E2E 는 실행 기록에만 있다 — 케이스 목록에는 시나리오가 없다 (도메인/실행 §8.7)
    expect(하위('실행 기록')).toEqual([
      ['기능 테스트', '#/runs/fn', '실행 기록 · 기능 테스트'],
      ['UI 테스트', '#/runs/ui', '실행 기록 · UI 테스트'],
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
    expect(지금자리('perfScenario', '#/cases')).toBe('#/perf/scenarios');
    expect(지금자리('perfPages', '#/cases')).toBe('#/perf/pages');
    expect(지금자리('perfRuns', '#/cases')).toBe('#/perf/runs');
    expect(지금자리('perfRun', '#/cases')).toBe('#/perf/runs');
    expect(지금자리('scenario', '#/cases')).toBe('#/scenarios');
  });

  it('그래프는 Grafana 라 바깥으로 나간다', () => {
    const 그래프 = 자리목록(김, 'MEM', 'ko').find((자리) => 자리.이름 === '그래프(Grafana)');
    expect(그래프?.바깥).toBe(true);
  });

  it('Grafana 는 같은 서버의 /grafana/ 다 — admin 이 로그인을 보고 대신 연다 (도메인/인증 §7)', () => {
    const 그래프 = 자리목록(김, 'MEM', 'ko').find((자리) => 자리.이름 === '그래프(Grafana)');
    expect(그래프?.해시).toBe('/grafana/');
  });

  it('대시보드가 집이다. 앱을 열면 품질 현황부터 본다', () => {
    expect(자리목록(김, 'MEM', 'ko')[0]?.해시).toBe('#/dashboard');
    expect(자리목록(김, 'MEM', 'ko')[0]?.하위).toBeUndefined();
  });

  it('대시보드 자리는 대시보드에 밑줄이 간다', () => {
    expect(지금자리('dashboard', '#/dashboard')).toBe('#/dashboard');
  });
});

describe('번호로 배정 애플리케이션 찾기', () => {
  it('대시보드가 넘긴 애플리케이션 번호로 그 배정 애플리케이션의 접두사를 낸다', () => {
    expect(배정서비스접두사(2, [결제, 회원])).toBe('MEM');
  });

  it('배정에 없는 번호면 아무것도 고르지 않는다', () => {
    expect(배정서비스접두사(9, [결제, 회원])).toBe(null);
  });
});

describe('대시보드 재료', () => {
  it('케이스 자리가 있나는 고른 애플리케이션의 케이스 칸을 본다 — 없으면 빈 안내판의 단추가 곧바로 되돌려진다', () => {
    const 실행만 = 사람('member', [{ ...회원, permissions: { cases: 'none', runs: 'read', authoring: 'none' } }]);
    expect(대시보드재료(실행만, 'MEM').케이스갈수있나).toBe(false);
    expect(대시보드재료(김, 'PAY').케이스갈수있나).toBe(true);
    expect(대시보드재료(김, null).케이스갈수있나).toBe(false);
  });

  it('설정 자리는 운영만 간다 — 정기 실행 안내 줄의 링크가 이것을 본다', () => {
    expect(대시보드재료(사람('admin', [결제]), 'PAY').설정갈수있나).toBe(true);
    expect(대시보드재료(김, 'PAY').설정갈수있나).toBe(false);
  });

  it('작성 애플리케이션은 고른 프로젝트 안에서 작성 칸이 none 이 아닌 배정 애플리케이션만 번호와 이름으로 준다', () => {
    const 작성없음 = { ...회원, permissions: { cases: 'read' as const, runs: 'read' as const, authoring: 'none' as const } };
    expect(대시보드재료(사람('member', [결제, 작성없음, 정산]), 'PAY').작성서비스).toEqual([{ id: 1, name: '결제 애플리케이션' }]);
    expect(대시보드재료(사람('member', [결제, 작성없음, 정산]), null).작성서비스).toEqual([
      { id: 1, name: '결제 애플리케이션' },
      { id: 3, name: '정산 애플리케이션' },
    ]);
  });

  it('프로젝트는 고른 애플리케이션의 프로젝트이고, 고른 것이 없으면 null 이다', () => {
    expect(대시보드재료(김, 'SET').프로젝트).toBe(20);
    expect(대시보드재료(김, 'PAY').프로젝트).toBe(10);
    expect(대시보드재료(김, null).프로젝트).toBe(null);
  });
});

describe('고른 애플리케이션', () => {
  it('저장된 접두사가 배정 목록에 있으면 그것을 연다', () => {
    expect(고른서비스('MEM', [결제, 회원])?.prefix).toBe('MEM');
  });

  it('저장된 것이 없으면 첫 번째를 연다', () => {
    expect(고른서비스(null, [결제, 회원])?.prefix).toBe('PAY');
  });

  it('배정이 빠진 애플리케이션이 저장돼 있으면 남의 것을 열지 않고 첫 번째로 돌아간다', () => {
    expect(고른서비스('PAY', [회원])?.prefix).toBe('MEM');
  });

  it('배정받은 것이 하나도 없으면 고를 것이 없다', () => {
    expect(고른서비스('PAY', [])).toBe(null);
  });
});

describe('배정받은 애플리케이션이 없을 때', () => {
  it('운영 계정은 스스로 풀 수 있다고 알려준다', () => {
    const 사유 = 빈띠사유(사람('admin', []), null, 'ko');
    expect(사유?.무엇).toBe('아직 배정받은 애플리케이션이 없습니다');
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

  it('넷 다 none 이면 권한이 없다고 먼저 알린다. 애플리케이션 0건 안내보다 앞선다', () => {
    const 사유 = 빈띠사유(사람('member', [], 'none'), null, 'ko');
    expect(사유?.무엇).toBe('권한을 받지 않았습니다. 관리자에게 요청하세요');
  });

  it('대시보드만 있어도 권한 없음이 아니다. 애플리케이션 0건 안내가 뜬다', () => {
    expect(빈띠사유(사람('member', [], 'read'), null, 'ko')?.무엇).toBe('아직 배정받은 애플리케이션이 없습니다');
  });

  it('자리를 안 주면 지금까지처럼 군다', () => {
    expect(빈띠사유(사람('admin', []), null, 'ko')?.무엇).toBe('아직 배정받은 애플리케이션이 없습니다');
  });
});
