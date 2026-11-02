// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthoringCoverage, AuthoringMadeCase, AuthoringRow } from './api.js';
import { AuthoringCases } from './AuthoringCases.js';
import { AuthoringTodo } from './AuthoringTodo.js';
import { prdApi, type PrdNow } from './prdApi.js';
import type { 판정 } from './role.js';

vi.mock('./RunWindow.js', () => ({
  RunWindow: ({ tcIds }: { tcIds: string[] }) => <div role="dialog" aria-label="실행 창">{tcIds.join(',')}</div>,
}));

const 운영: 판정 = () => true;
const 설정없음: 판정 = (일) => 일 !== '설정';

const 결제: AuthoringMadeCase = {
  tcId: 'PAY-FN-001',
  name: '결제가 끝나면 영수증이 보인다',
  file: 'tests/pay/receipt.spec.ts',
  change: 'NEW',
  verifies: ['결제 완료 문구가 보인다', '영수증 번호가 보인다', '메일이 간다'],
  reqs: ['FR-001', 'FR-002'],
};
const 버튼: AuthoringMadeCase = {
  tcId: 'PAY-UI-002',
  name: '결제 버튼이 보인다',
  file: 'tests/pay/button.ui.spec.ts',
  change: 'CHANGED',
  verifies: ['버튼이 보인다'],
  reqs: [],
};
const 환불: AuthoringMadeCase = { ...결제, tcId: 'PAY-FN-003', name: '환불이 된다', change: 'CHANGED', verifies: ['환불 문구가 보인다'], reqs: ['FR-003'] };

function 줄(덮을것: Partial<AuthoringRow>): AuthoringRow {
  return {
    id: 7,
    kind: 'AUTHOR',
    sourceId: null,
    status: 'DONE',
    stage: '끝',
    stageAt: new Date().toISOString(),
    requestedByName: '테스터',
    claimedBy: '맥',
    prUrl: 'https://github.com/x/y/pull/3',
    error: null,
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    ...덮을것,
  };
}

const 반영줄 = (덮을것: Partial<AuthoringRow> = {}) => 줄({ id: 8, kind: 'MERGE', sourceId: 7, prUrl: null, ...덮을것 });
const reload = vi.fn();

beforeEach(() => {
  reload.mockClear();
  window.location.hash = '';
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('만든 케이스 표', () => {
  it('이름 · 새로/바뀜 칩 · 확인 첫 줄 · 외 N개 · 요구사항 고리를 보인다', () => {
    render(<AuthoringCases cases={[결제, 버튼]} prUrl="https://github.com/x/y/pull/3" 등록됨={false} />);
    const 표 = screen.getByRole('table', { name: '만든 케이스' });
    expect(표.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(screen.getByText('결제가 끝나면 영수증이 보인다')).toBeTruthy();
    expect(screen.getByText('새로')).toBeTruthy();
    expect(screen.getByText('바뀜')).toBeTruthy();
    expect(screen.getByText('결제 완료 문구가 보인다')).toBeTruthy();
    expect(screen.getByText('외 2개')).toBeTruthy();
    expect(screen.getByText('영수증 번호가 보인다').closest('details')).not.toBeNull();
    expect(screen.getByText('버튼이 보인다').closest('details')).toBeNull();
    expect(screen.getByRole('link', { name: 'FR-001' }).getAttribute('href')).toBe('#/prd/FR-001');
    expect(screen.getByRole('link', { name: 'FR-002' }).getAttribute('href')).toBe('#/prd/FR-002');
    expect(screen.getByText('2건')).toBeTruthy();
  });

  it('요구 번호가 없는 케이스는 대시로 둔다', () => {
    render(<AuthoringCases cases={[버튼]} prUrl={null} 등록됨={false} />);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.getAllByRole('cell').at(-1)?.textContent).toBe('—');
  });

  it('반영 전에는 케이스 번호가 고리가 아니다', () => {
    render(<AuthoringCases cases={[결제, 버튼]} prUrl={null} 등록됨={false} />);
    expect(screen.getByText('PAY-FN-001').closest('a')).toBeNull();
    expect(screen.getByText('PAY-UI-002').closest('a')).toBeNull();
  });

  it('반영이 끝나면 케이스 번호가 기능 · UI 상세 고리다', () => {
    render(<AuthoringCases cases={[결제, 버튼]} prUrl={null} 등록됨 />);
    expect(screen.getByRole('link', { name: 'PAY-FN-001' }).getAttribute('href')).toBe('#/cases/fn?q=PAY-FN-001&case=PAY-FN-001');
    expect(screen.getByRole('link', { name: 'PAY-UI-002' }).getAttribute('href')).toBe('#/cases/ui?q=PAY-UI-002&case=PAY-UI-002');
  });

  it('반영 전에 사람이 뺀 케이스는 반영 뒤에도 고리가 아니고 반영 때 뺐다고 적는다', () => {
    render(<AuthoringCases cases={[결제, 버튼]} prUrl={null} 등록됨 뺀번호={new Set(['PAY-UI-002'])} />);
    expect(screen.getByRole('link', { name: 'PAY-FN-001' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'PAY-UI-002' })).toBeNull();
    expect(screen.getByText(/반영 때 뺌/)).toBeTruthy();
  });

  it('목록이 null 이고 PR 이 있으면 남기지 않았다는 문장과 PR 고리를 낸다', () => {
    render(<AuthoringCases cases={null} prUrl="https://github.com/x/y/pull/3" 등록됨={false} />);
    expect(screen.getByText(/이 요청은 만든 케이스 목록을 남기지 않았습니다/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'PR 에서 보기' }).getAttribute('href')).toBe('https://github.com/x/y/pull/3');
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('목록이 null 이고 PR 도 없으면 · 목록이 비었으면 아무것도 안 그린다', () => {
    const 하나 = render(<AuthoringCases cases={null} prUrl={null} 등록됨={false} />);
    expect(하나.container.innerHTML).toBe('');
    const 둘 = render(<AuthoringCases cases={[]} prUrl="https://github.com/x/y/pull/3" 등록됨={false} />);
    expect(둘.container.innerHTML).toBe('');
  });
});

describe('다음 단계의 만든 케이스 확인', () => {
  it('만든 케이스가 있으면 건수 제목과 만든 케이스 보기 · PR 열기를 낸다', () => {
    render(<AuthoringTodo service="PAY" 요청={줄({ cases: [결제, 버튼] })} 할수={운영} 차이수={0} reload={reload} />);
    expect(screen.getByText('만든 케이스 2건 확인')).toBeTruthy();
    expect(screen.getByRole('button', { name: '만든 케이스 보기' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'PR 열기' }).getAttribute('href')).toBe('https://github.com/x/y/pull/3');
    expect(screen.queryByText('만든 케이스 검토')).toBeNull();
  });

  it('목록을 남기지 않은 옛 요청은 예전 만든 케이스 검토를 낸다', () => {
    render(<AuthoringTodo service="PAY" 요청={줄({})} 할수={운영} 차이수={0} reload={reload} />);
    expect(screen.getByText('만든 케이스 검토')).toBeTruthy();
    expect(screen.getByRole('link', { name: '만든 케이스 보기 (PR)' }).getAttribute('href')).toBe('https://github.com/x/y/pull/3');
    expect(screen.queryByRole('button', { name: '만든 케이스 보기' })).toBeNull();
  });

  it('차이 항목 설명은 결정 필요에서 정하라고 하고 다른 곳 보기 · 결정 필요로 가기를 낸다', () => {
    render(<AuthoringTodo service="PAY" 요청={줄({})} 할수={운영} 차이수={2} reload={reload} />);
    expect(screen.getByText('기획서와 다른 곳 2건 확인')).toBeTruthy();
    expect(screen.getByText(/결정 필요에서 어느 쪽이 맞는지 정하세요\./)).toBeTruthy();
    expect(screen.getByRole('button', { name: '다른 곳 보기' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '결정 필요로 가기' }).getAttribute('href')).toBe('#/authoring?todo=1');
  });
});

describe('반영 끝 — 바로 실행', () => {
  it('기능과 UI 가 섞이면 갈래별 단추 둘과 전체 건수를 낸다', () => {
    render(<AuthoringTodo service="PAY" 요청={반영줄()} 만든것={[결제, 환불, 버튼]} 할수={운영} 차이수={0} reload={reload} />);
    expect(screen.getByText('테스트 3건을 케이스 목록에 넣었습니다.')).toBeTruthy();
    expect(screen.getByRole('button', { name: '기능 테스트 2건 바로 실행' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'UI 테스트 1건 바로 실행' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '만든 케이스 3건 보기' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: '케이스 목록 열기' })).toBeNull();
  });

  it('한 갈래뿐이면 그 단추 하나만 낸다', () => {
    render(<AuthoringTodo service="PAY" 요청={반영줄()} 만든것={[결제, 환불]} 할수={운영} 차이수={0} reload={reload} />);
    expect(screen.getByRole('button', { name: '기능 테스트 2건 바로 실행' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /UI 테스트/ })).toBeNull();
  });

  it('갈래 단추를 누르면 그 갈래의 케이스 번호만 실행 창에 담아 연다', () => {
    render(<AuthoringTodo service="PAY" 요청={반영줄()} 만든것={[결제, 환불, 버튼]} 할수={운영} 차이수={0} reload={reload} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'UI 테스트 1건 바로 실행' }));
    expect(screen.getByRole('dialog').textContent).toBe('PAY-UI-002');
    cleanup();
    render(<AuthoringTodo service="PAY" 요청={반영줄()} 만든것={[결제, 환불, 버튼]} 할수={운영} 차이수={0} reload={reload} />);
    fireEvent.click(screen.getByRole('button', { name: '기능 테스트 2건 바로 실행' }));
    expect(screen.getByRole('dialog').textContent).toBe('PAY-FN-001,PAY-FN-003');
  });

  it('만든 케이스 목록이 없으면 예전 문장과 케이스 목록 열기를 낸다', () => {
    render(<AuthoringTodo service="PAY" 요청={반영줄()} 만든것={null} 할수={운영} 차이수={0} reload={reload} />);
    expect(screen.getByText('테스트가 반영됐습니다. 케이스 목록에서 새 케이스를 볼 수 있습니다.')).toBeTruthy();
    expect(screen.getByRole('link', { name: '케이스 목록 열기' }).getAttribute('href')).toBe('#/cases');
    expect(screen.queryByRole('button', { name: /바로 실행/ })).toBeNull();
  });
});

const 계정셈: AuthoringCoverage = { total: 6, cased: 4, held: 0, excluded: { '계정 미등록': 2 }, missing: [], later: [] };
const 지금 = (roles: { role: string; count: number; registered: boolean }[], reqs: Record<string, string[]>) =>
  vi.spyOn(prdApi, 'now').mockResolvedValue({ held: { reqs, roles, continueFrom: null } } as PrdNow);

describe('계정 없음 단계', () => {
  it('운영자에게는 없는 역할 이름 · 요구 번호 고리 · 설정에서 등록 고리를 낸다', async () => {
    지금([{ role: '판매자', count: 1, registered: false }], { 'FR-021': ['판매자'], 'FR-030': ['구매자'] });
    render(<AuthoringTodo service="PAY" 요청={반영줄()} 커버리지={계정셈} 할수={운영} 차이수={0} reload={reload} />);
    expect(screen.getByText('계정이 없어 못 쓴 요구 2개')).toBeTruthy();
    expect(await screen.findByText('판매자 계정이 없어 테스트를 못 썼습니다. 계정을 넣으면 이 요구만 이어 작성합니다')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'FR-021' }).getAttribute('href')).toBe('#/prd/FR-021');
    expect(screen.queryByRole('link', { name: 'FR-030' })).toBeNull();
    expect(screen.getByRole('link', { name: '설정에서 판매자 계정 등록' }).getAttribute('href')).toBe('#/settings/PAY');
  });

  it('설정 메뉴가 없는 사람에게는 설정 고리 대신 운영자에게 요청하라고 한다', async () => {
    지금([{ role: '판매자', count: 1, registered: false }], { 'FR-021': ['판매자'] });
    render(<AuthoringTodo service="PAY" 요청={반영줄()} 커버리지={계정셈} 할수={설정없음} 차이수={0} reload={reload} />);
    expect(await screen.findByText('관리자에게 판매자 계정 등록을 요청하세요')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /설정에서/ })).toBeNull();
  });

  it('그새 계정을 다 넣었으면 PRD 관리에서 이어 작성하라고 하고 역할 이름은 안 적는다', async () => {
    지금([{ role: '판매자', count: 1, registered: true }], { 'FR-021': ['판매자'] });
    render(<AuthoringTodo service="PAY" 요청={반영줄()} 커버리지={계정셈} 할수={운영} 차이수={0} reload={reload} />);
    expect(await screen.findByText('필요한 계정을 모두 넣었습니다. PRD 관리에서 이 요구만 이어 작성하세요')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'PRD 관리로 가기' }).getAttribute('href')).toBe('#/prd');
    expect(screen.queryByRole('link', { name: /설정에서/ })).toBeNull();
  });

  it('계정 때문에 제외한 요구가 없으면 단계를 안 그린다', () => {
    const 읽기 = 지금([], {});
    render(<AuthoringTodo service="PAY" 요청={반영줄()} 커버리지={{ ...계정셈, excluded: {} }} 할수={운영} 차이수={0} reload={reload} />);
    expect(screen.queryByText(/계정이 없어 못 쓴 요구/)).toBeNull();
    expect(읽기).not.toHaveBeenCalled();
  });

  it('끝난 작성 요청의 다음 단계에도 같은 단계가 있다', async () => {
    지금([{ role: '판매자', count: 1, registered: false }], { 'FR-021': ['판매자'] });
    render(<AuthoringTodo service="PAY" 요청={줄({})} 커버리지={계정셈} 할수={운영} 차이수={0} reload={reload} />);
    expect(screen.getByText('계정이 없어 못 쓴 요구 2개')).toBeTruthy();
    expect(await screen.findByRole('link', { name: '설정에서 판매자 계정 등록' })).toBeTruthy();
  });
});

describe('폐기 확인 창', () => {
  it('PR 이 있으면 PR 닫으러 가기 고리를 그 PR 주소로 낸다', () => {
    render(<AuthoringTodo service="PAY" 요청={줄({ canDiscard: true })} 할수={운영} 차이수={0} reload={reload} />);
    expect(screen.queryByRole('link', { name: 'PR 닫으러 가기' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '폐기' }));
    expect(screen.getByRole('link', { name: 'PR 닫으러 가기' }).getAttribute('href')).toBe('https://github.com/x/y/pull/3');
  });

  it('PR 이 없으면 고리를 안 낸다', () => {
    render(<AuthoringTodo service="PAY" 요청={줄({ status: 'FAILED', prUrl: null, canDiscard: true })} 할수={운영} 차이수={0} reload={reload} />);
    fireEvent.click(screen.getByRole('button', { name: '폐기' }));
    expect(screen.getByText('이 요청을 폐기할까요?')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'PR 닫으러 가기' })).toBeNull();
  });
});
