// @vitest-environment jsdom
// QA 리포트 보기 화면 검사 (도메인/리포팅 §8.21 「리포트 보기」 · 「승인」)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ApiError, type User } from './api.js';
import { QaReport } from './QaReport.js';
import { qaReportApi, type 리포트응답 } from './qaReportApi.js';

const 사람 = (덮: Partial<User> = {}): User =>
  ({
    username: 'park',
    displayName: '박지훈',
    role: 'admin',
    dashboard: 'read',
    mustChangePassword: false,
    services: [{ id: 7, prefix: 'DMW', name: '데모마켓 웹', projectId: 10, permissions: { cases: 'write', runs: 'write', authoring: 'write' } }],
    ...덮,
  }) as User;

const 리포트 = (덮: Partial<리포트응답> = {}): 리포트응답 => ({
  id: 31,
  service: 'DMW',
  env: 'qa',
  buildNo: '124',
  runId: null,
  perfRunId: null,
  version: 1,
  versions: [{ id: 31, version: 1, approvedAt: null }],
  summary: { overview: { serviceName: '데모마켓 웹', running: 0 } } as 리포트응답['summary'],
  ai: { first: '기능 리스크\n- 결제 금액 회귀 실패 2건', current: '기능 리스크\n- 결제 금액 회귀 실패 2건', editedBy: null, editedAt: null },
  runIds: [812],
  perfRunIds: [],
  performers: ['kim'],
  approval: null,
  updatedAt: '2026-11-14T01:45:00Z',
  ...덮,
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('QA 리포트 보기', () => {
  it('머리에 빌드 · 승인 상태 · 다운로드 형식 셋을 두고 본문은 서버가 지은 HTML 문서를 싣는다', async () => {
    vi.spyOn(qaReportApi, 'get').mockResolvedValue(리포트());
    render(<QaReport id={31} user={사람()} />);
    expect(await screen.findByRole('heading', { name: /빌드 124/ })).toBeTruthy();
    expect(screen.getByText('승인 전')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'PDF' }).getAttribute('href')).toBe('/api/qa-reports/31/file?format=PDF');
    expect(screen.getByRole('link', { name: '워드' }).getAttribute('href')).toBe('/api/qa-reports/31/file?format=DOCX');
    // 엑셀은 통로가 아직 400 이다
    expect(screen.queryByRole('link', { name: /엑셀|XLSX/ })).toBeNull();
    expect(screen.getByTitle('리포트 본문').getAttribute('src')).toBe('/api/qa-reports/31/file?format=HTML');
  });

  it('관리자이고 수행자가 아니면 승인하고, 승인 뒤 승인자와 지문 앞 12자를 보인다', async () => {
    const 읽기 = vi
      .spyOn(qaReportApi, 'get')
      .mockResolvedValueOnce(리포트())
      .mockResolvedValue(리포트({ approval: { by: 'park', byName: '박지훈', at: '2026-11-14T09:05:00Z', late: true, sha256: 'abcdef0123456789abcdef' } }));
    const 승인 = vi.spyOn(qaReportApi, 'approve').mockResolvedValue({ approval: null });
    render(<QaReport id={31} user={사람()} />);
    fireEvent.click(await screen.findByRole('button', { name: '승인' }));
    await waitFor(() => expect(승인).toHaveBeenCalledWith(31));
    expect(await screen.findByText('abcdef012345')).toBeTruthy();
    expect(screen.getByText(/사후 승인/)).toBeTruthy();
    expect(읽기).toHaveBeenCalledTimes(2);
    // 승인된 버전은 문장을 못 고친다
    expect(screen.queryByRole('button', { name: '남은 리스크 문장 수정' })).toBeNull();
  });

  it('수행자 · 진행 중 · 마지막 버전이 아니면 승인 단추를 막고 까닭을 한 줄로 적는다', async () => {
    vi.spyOn(qaReportApi, 'get').mockResolvedValue(리포트());
    render(<QaReport id={31} user={사람({ username: 'kim' })} />);
    expect(((await screen.findByRole('button', { name: '승인' })) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('수행자는 승인할 수 없습니다')).toBeTruthy();
    cleanup();

    vi.spyOn(qaReportApi, 'get').mockResolvedValue(리포트({ summary: { overview: { serviceName: '데모마켓 웹', running: 1 } } as 리포트응답['summary'] }));
    render(<QaReport id={31} user={사람()} />);
    expect(await screen.findByText('진행 중인 실행이 완료되면 승인할 수 있습니다')).toBeTruthy();
    cleanup();

    vi.spyOn(qaReportApi, 'get').mockResolvedValue(리포트({ versions: [{ id: 31, version: 1, approvedAt: null }, { id: 40, version: 2, approvedAt: null }] }));
    render(<QaReport id={31} user={사람()} />);
    expect(await screen.findByText('더 새 버전이 있습니다. 마지막 버전에서 승인할 수 있습니다')).toBeTruthy();
  });

  it('서버가 승인을 거절하면 리포트 화면의 말로 옮긴다', async () => {
    vi.spyOn(qaReportApi, 'get').mockResolvedValue(리포트());
    vi.spyOn(qaReportApi, 'approve').mockRejectedValue(new ApiError(409, 'AI_PENDING', 'AI_PENDING'));
    render(<QaReport id={31} user={사람()} />);
    fireEvent.click(await screen.findByRole('button', { name: '승인' }));
    expect((await screen.findByRole('alert')).textContent).toBe('AI 가 남은 리스크를 작성하는 중입니다. 작성이 완료되면 승인할 수 있습니다');
  });

  it('관리자가 아니면 승인 칸이 없다', async () => {
    vi.spyOn(qaReportApi, 'get').mockResolvedValue(리포트());
    render(<QaReport id={31} user={사람({ role: 'member' })} />);
    await screen.findByRole('heading', { name: /빌드 124/ });
    expect(screen.queryByRole('button', { name: '승인' })).toBeNull();
  });

  it('실행 쓰기 권한이면 남은 리스크를 지금 글에서 고쳐 저장한다. 읽기 권한이면 단추가 없다', async () => {
    vi.spyOn(qaReportApi, 'get').mockResolvedValue(리포트());
    const 저장 = vi.spyOn(qaReportApi, 'saveAi').mockResolvedValue({ ai: null });
    render(<QaReport id={31} user={사람()} />);
    fireEvent.click(await screen.findByRole('button', { name: '남은 리스크 문장 수정' }));
    const 칸 = screen.getByLabelText('남은 리스크') as HTMLTextAreaElement;
    expect(칸.value).toBe('기능 리스크\n- 결제 금액 회귀 실패 2건');
    fireEvent.change(칸, { target: { value: '기능 리스크\n- 결제 금액 회귀 실패 2건 · DM-215' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(저장).toHaveBeenCalledWith(31, '기능 리스크\n- 결제 금액 회귀 실패 2건 · DM-215'));
    cleanup();

    const 읽기권한 = 사람({ role: 'member', services: [{ id: 7, prefix: 'DMW', name: '데모마켓 웹', projectId: 10, permissions: { cases: 'read', runs: 'read', authoring: 'read' } }] as User['services'] });
    render(<QaReport id={31} user={읽기권한} />);
    await screen.findByRole('heading', { name: /빌드 124/ });
    expect(screen.queryByRole('button', { name: '남은 리스크 문장 수정' })).toBeNull();
  });

  it('버전이 여럿이면 고르개로 그 버전의 주소로 간다', async () => {
    vi.spyOn(qaReportApi, 'get').mockResolvedValue(리포트({ id: 40, version: 2, versions: [{ id: 31, version: 1, approvedAt: '2026-11-12T09:05:00Z' }, { id: 40, version: 2, approvedAt: null }] }));
    render(<QaReport id={40} user={사람()} />);
    fireEvent.change(await screen.findByLabelText('버전'), { target: { value: '31' } });
    expect(window.location.hash).toBe('#/qa-reports/31');
  });
});
