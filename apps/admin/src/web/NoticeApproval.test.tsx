// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { api, type NoticeResponse } from './api.js';
import { 언어함 } from './i18n.js';
import { Notice } from './Notice.js';
import { 끝난실행, 승인전 } from './notice.fixture.js';
import { 읽음들 } from './noticeRead.js';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function 띄운다(답: NoticeResponse) {
  vi.spyOn(api, 'notifications').mockResolvedValue(답);
  render(
    <언어함 value="ko">
      <Notice 줄숨김={false} 서비스바꿈={vi.fn()} />
    </언어함>,
  );
}

const 버튼 = () => document.querySelector('.nt-btn') as HTMLElement;

async function 연다(답: NoticeResponse, 배지: string) {
  띄운다(답);
  await screen.findByLabelText(배지);
  fireEvent.click(버튼());
  return within(screen.getByRole('complementary', { name: '알림' }));
}

describe('알림 서랍의 승인 전 QA 리포트', () => {
  it('본문 위 줄에는 안 서고 서랍에서 끝난 줄보다 앞에 선다', async () => {
    const 서랍 = await 연다({ running: [], recent: [끝난실행(1)], approvals: [승인전(7)] }, '안 읽은 알림 2건');
    expect(document.querySelector('.nt-lines')?.textContent ?? '').not.toContain('QA 리포트');
    const 제목들 = 서랍.getAllByRole('listitem').map((li) => li.querySelector('.nt-item-title')?.textContent);
    expect(제목들[0]).toBe('빌드 124 QA 리포트 · 승인 전');
    expect(제목들).toHaveLength(2);
    expect(서랍.getByText('결제 애플리케이션')).toBeTruthy();
  });

  it('실행 거르개에서는 안 보이고 전체 · 안 읽음에서는 보인다', async () => {
    const 서랍 = await 연다({ running: [], recent: [끝난실행(1)], approvals: [승인전(7)] }, '안 읽은 알림 2건');
    fireEvent.click(서랍.getByRole('button', { name: '실행' }));
    expect(서랍.queryByText('빌드 124 QA 리포트 · 승인 전')).toBeNull();
    fireEvent.click(서랍.getByRole('button', { name: '작성' }));
    expect(서랍.queryByText('빌드 124 QA 리포트 · 승인 전')).toBeNull();
    fireEvent.click(서랍.getByRole('button', { name: '안 읽음 2' }));
    expect(서랍.getByText('빌드 124 QA 리포트 · 승인 전')).toBeTruthy();
  });

  it('누르면 리포트 보기로 가고 읽음 열쇠가 적히며 서랍이 닫힌다', async () => {
    const 서랍 = await 연다({ running: [], recent: [], approvals: [승인전(7)] }, '안 읽은 알림 1건');
    const 링크 = 서랍.getByRole('link');
    expect(링크.getAttribute('href')).toBe('#/qa-reports/7');
    fireEvent.click(링크);
    expect(읽음들().has('qa_report:7')).toBe(true);
    expect(screen.queryByRole('complementary', { name: '알림' })).toBeNull();
    expect(document.querySelector('.nt-badge')).toBeNull();
  });

  it('모두 읽음으로에도 든다', async () => {
    const 서랍 = await 연다({ running: [], recent: [], approvals: [승인전(7), 승인전(8)] }, '안 읽은 알림 2건');
    fireEvent.click(서랍.getByRole('button', { name: '모두 읽음으로' }));
    expect([...읽음들()].sort()).toEqual(['qa_report:7', 'qa_report:8']);
  });

  it('승인 전 줄만 있어도 비었다는 안내를 안 띄운다', async () => {
    const 서랍 = await 연다({ running: [], recent: [], approvals: [승인전(7)] }, '안 읽은 알림 1건');
    expect(서랍.queryByText('최근 7일 동안 종료된 실행과 작성이 없습니다')).toBeNull();
  });

  it('읽음 정리가 승인 전 열쇠를 지우지 않는다', async () => {
    const 오래전 = Date.now() - 10 * 86_400_000;
    localStorage.setItem('notice-read', JSON.stringify({ 'qa_report:7': 오래전, 'qa_report:9': 오래전 }));
    띄운다({ running: [], recent: [], approvals: [승인전(7)] });
    await screen.findByText('알림');
    await vi.waitFor(() => {
      expect(읽음들().has('qa_report:9')).toBe(false);
    });
    expect(읽음들().has('qa_report:7')).toBe(true);
  });

  it('approvals 칸이 없는 옛 응답도 그린다', async () => {
    const 서랍 = await 연다({ running: [], recent: [끝난실행(1)] }, '안 읽은 알림 1건');
    expect(서랍.getAllByRole('listitem')).toHaveLength(1);
  });
});
