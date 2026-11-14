// @vitest-environment jsdom
// 프로젝트 QA 리포트 보기 화면 검사 (도메인/리포팅 §8.21 · 시안 ④)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { User } from './api.js';
import { QaProjectReport } from './QaProjectReport.js';
import { qaReportApi, type 프로젝트리포트응답 } from './qaReportApi.js';

const 사람 = (runs: 'read' | 'write'): User =>
  ({
    username: 'kim',
    displayName: '김하늘',
    role: 'member',
    dashboard: 'read',
    mustChangePassword: false,
    services: [{ id: 7, prefix: 'DMW', name: '데모마켓 웹', projectId: 10, permissions: { cases: 'read', runs, authoring: 'none' } }],
  }) as User;

const 리포트 = (): 프로젝트리포트응답 => ({
  id: 5,
  projectId: 10,
  projectName: '데모마켓',
  from: '2026-11-10',
  to: '2026-11-14',
  tz: 'Asia/Seoul',
  origin: 'MANUAL',
  body: {} as 프로젝트리포트응답['body'],
  ai: { first: '기능 리스크\n- 신규 · 결제 회귀', current: '기능 리스크\n- 신규 · 결제 회귀', editedBy: null, editedAt: null },
  createdBy: '김하늘',
  createdAt: '2026-11-14T09:00:00Z',
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('프로젝트 QA 리포트 보기', () => {
  it('머리에 프로젝트 · 기간과 PDF · 워드를 두고 본문은 서버가 지은 HTML 문서를 싣는다 — 승인 칸은 없다', async () => {
    vi.spyOn(qaReportApi, 'projectGet').mockResolvedValue(리포트());
    render(<QaProjectReport id={5} user={사람('read')} />);
    expect(await screen.findByRole('heading', { name: /데모마켓 QA 리포트 · 11\/10 ~ 11\/14/ })).toBeTruthy();
    expect(screen.getByText(/직접 만듦 · 김하늘/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'PDF' }).getAttribute('href')).toBe('/api/qa-project-reports/5/file?format=PDF');
    expect(screen.getByRole('link', { name: '워드' }).getAttribute('href')).toBe('/api/qa-project-reports/5/file?format=DOCX');
    expect(screen.queryByRole('link', { name: 'HTML' })).toBeNull();
    expect(screen.getByTitle('리포트 본문').getAttribute('src')).toBe('/api/qa-project-reports/5/file?format=HTML');
    expect(screen.queryByRole('button', { name: '승인' })).toBeNull();
    // 실행 read 는 문장을 못 고친다
    expect(screen.queryByRole('button', { name: '리스크 문장 수정' })).toBeNull();
  });

  it('실행 write 면 리스크 문장을 고치고 다시 읽는다', async () => {
    const 읽기 = vi.spyOn(qaReportApi, 'projectGet').mockResolvedValue(리포트());
    const 저장 = vi.spyOn(qaReportApi, 'projectSaveAi').mockResolvedValue({ ai: null });
    render(<QaProjectReport id={5} user={사람('write')} />);
    fireEvent.click(await screen.findByRole('button', { name: '리스크 문장 수정' }));
    const 칸 = screen.getByLabelText('지난 리포트 대비 리스크');
    expect((칸 as HTMLTextAreaElement).value).toBe('기능 리스크\n- 신규 · 결제 회귀');
    fireEvent.change(칸, { target: { value: '기능 리스크\n- 계속 · 결제 회귀' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(저장).toHaveBeenCalledWith(5, '기능 리스크\n- 계속 · 결제 회귀'));
    await waitFor(() => expect(읽기).toHaveBeenCalledTimes(2));
  });
});
