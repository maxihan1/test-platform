// 케이스 목록 맥락 · 목차 테스트 둘이 같이 쓰는 차림 — 케이스 · 묶음 번호표 · 그리기 · 목차와 이름표 읽기 (CaseListContext.test · CaseListLine.test)

import { render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';

import { api, type CaseGroup, type CasePage, type CaseRow, type CaseQuery, type 앱종류 } from './api.js';
import { CaseList } from './CaseList.js';
import type { 판정 } from './role.js';

export const 화면 = 'tests/zcl/pages/signup.page.ts';

export function 케이스(tcId: string, 더: Partial<CaseRow> = {}): CaseRow {
  return {
    tcId,
    name: `${tcId} 케이스`,
    platforms: ['desktop'],
    precondition: [],
    filePath: `tests/${tcId}.spec.ts`,
    paramSchema: {},
    expectedSchema: {},
    isActive: true,
    scannedAt: '2026-10-11T00:00:00.000Z',
    feature: null,
    reqs: [],
    screens: [],
    ...더,
  };
}

export const 비번 = 케이스('ZCL-FN-001', {
  feature: '회원가입',
  reqs: [
    { reqId: 'ZCL-REQ-003', text: '비밀번호는 8자 이상 20자 이하', axis: '경계' },
    { reqId: 'ZCL-REQ-004', text: '비밀번호에 숫자를 섞는다', axis: '경계' },
  ],
  screens: [{ file: 화면, url: '/signup' }],
  techniques: ['경계값 분석'],
});
export const 겹침 = 케이스('ZCL-FN-002', { feature: '회원가입', reqs: [{ reqId: 'ZCL-REQ-001', text: '이메일은 한 번만 쓴다', axis: '예외' }] });
export const 옛것 = 케이스('ZCL-FN-003', { reqs: [{ reqId: 'REQ-COM-006', text: null, axis: '예외' }] });
export const 묶음들: CaseGroup[] = [
  { feature: '회원가입', screen: null, screenUrl: null, part: null, tcIds: ['ZCL-FN-002'] },
  { feature: '회원가입', screen: 화면, screenUrl: '/signup', part: null, tcIds: ['ZCL-FN-001'] },
  { feature: null, screen: null, screenUrl: null, part: null, tcIds: ['ZCL-FN-003'] },
];
export const 쪽: CasePage = { items: [겹침, 비번, 옛것], total: 3, page: 1, pageSize: 50, groups: 묶음들, hasFeatures: true };

export const 전부된다: 판정 = () => true;

export function 그리기(더: { 요구보나?: boolean; 요구?: string; kind?: 'UI' | 'FN'; 받을쪽?: CasePage | ((page: number) => CasePage); 앱종류?: 앱종류 } = {}) {
  vi.spyOn(api, 'lastScan').mockResolvedValue(null);
  vi.spyOn(api, 'lastByCase').mockResolvedValue({
    items: [{ tcId: 'ZCL-FN-001', platform: 'desktop', status: 'FAIL', runId: 1, historyId: 1, finishedAt: '2026-10-11T00:00:00.000Z', durationMs: 10, recent: ['FAIL'] }],
  } as Awaited<ReturnType<typeof api.lastByCase>>);
  const 받을쪽 = 더.받을쪽 ?? 쪽;
  const 스파이 = vi.spyOn(api, 'cases').mockImplementation((q) => Promise.resolve(typeof 받을쪽 === 'function' ? 받을쪽(q.page ?? 1) : 받을쪽));
  render(<CaseList kind={더.kind ?? 'FN'} service="ZCL" 할수={전부된다} 결과보나 요구보나={더.요구보나 ?? true} 요구={더.요구} 앱종류={더.앱종류} />);
  return 스파이;
}

export const 마지막조건 = (스파이: { mock: { calls: [CaseQuery][] } }) => 스파이.mock.calls.at(-1)![0];

export const 이름표들 = () => [...document.querySelectorAll('.toc-label')].map((el) => [...el.children].map((자식) => 자식.textContent));
export const 목차 = () => screen.queryByRole('navigation', { name: '기능 묶음 목차' });
export const 목차줄들 = () => within(목차()!).getAllByRole('button').map((줄) => [...줄.children].map((자식) => 자식.textContent));

export const 첫쪽: CasePage = { ...쪽, items: [겹침, 비번], pageSize: 2 };
export const 둘째쪽: CasePage = { ...쪽, items: [옛것], page: 2, pageSize: 2 };
export const 쪽나눔 = (page: number) => (page === 1 ? 첫쪽 : 둘째쪽);
export const 더보기 = () => screen.getByRole('button', { name: '3건 중 2건 · 더 보기' });
