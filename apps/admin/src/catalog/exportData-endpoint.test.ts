// 엑셀 자료가 목록과 같은 엔드포인트 조건으로 케이스를 모으는지 본다 — 버튼 건수와 받은 파일 건수가 같아야 한다 (도메인/카탈로그 §7 · WEB-F7-22)

import { describe, expect, it, vi } from 'vitest';

const listCases = vi.fn(async () => ({ items: [] }));
vi.mock('./store.js', () => ({ listCases }));

const { 엑셀자료 } = await import('./exportData.js');

describe('엑셀 자료 엔드포인트 조건', () => {
  it('?endpoint= 를 목록 조회에 그대로 넘긴다', async () => {
    await 엑셀자료({ service: 'XCE', serviceId: 0, q: '', activeOnly: true, canSeeRuns: false, canSeeAuthoring: false, feature: '주문', endpoint: 'POST /api/orders' });
    expect(listCases).toHaveBeenCalledWith(expect.objectContaining({ feature: '주문', endpoint: 'POST /api/orders' }));
  });
});
