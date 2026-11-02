// @vitest-environment jsdom
// 설정 › BTS 연결 화면 검사 (도메인/BTS §8.15 · 시안 B 3판) — 불러온 상태 고르기 · 저장하고 자동 설정 · 막힌 것 · 배포 한 줄 · 연결 해제

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, ApiError, type SettingsServiceRow } from './api.js';
import { btsApi, type BTS연결 } from './btsApi.js';
import { SettingsBts } from './SettingsBts.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 프로젝트 = { id: 3, name: '데모마켓' };

const 앱: SettingsServiceRow = {
  id: 11,
  prefix: 'MKW',
  name: '웹',
  color: '#6B7280',
  projectId: 3,
  projectName: '데모마켓',
  envs: [],
  hasSlackWebhook: false,
  testsRepo: '',
  testsDir: 'mkw',
  isActive: true,
  caseCount: 0,
  codeRepos: [],
};

const 빈연결: BTS연결 = {
  linked: false, baseUrl: null, btsProject: null, botKeyTail: null, statusMap: {}, resolutionMap: {}, deployKey: null, ruleToken: null, publicUrl: 'https://qahub.example.com',
};

const 상태 = { DEPLOY_WAIT: 'ready', QA_REQUEST: 'qa-req', QA_REVIEW: 'qa-review', DEV_REQUEST: 'todo', CODE_REVIEW: 'review', CLOSED: 'done' };
const 해결 = { SCREEN_RIGHT: "Won't Fix", TEST_PROBLEM: 'Test Issue', FLAKY: 'Flaky', ENV: 'Environment', DUPLICATE: 'Duplicate' };

const 이은연결: BTS연결 = {
  ...빈연결, linked: true, baseUrl: 'https://bts.example.com', btsProject: 'DM', botKeyTail: 'a1b2', statusMap: 상태, resolutionMap: 해결,
};

const 목록 = {
  statuses: [
    { key: 'ready', name: 'Ready to deploy' },
    { key: 'qa-req', name: 'QA Requested' },
    { key: 'qa-review', name: 'QA Review' },
    { key: 'todo', name: 'To Do' },
    { key: 'review', name: 'In Review' },
    { key: 'done', name: 'Done' },
  ],
  resolutions: Object.values(해결).map((name) => ({ name })),
};

const 다됨 = (['WEBHOOK', 'RULE_ASSIGNEE', 'RULE_PR', 'BOARD'] as const).map((what) => ({ what, ok: true }));

function 그리기(연결: BTS연결) {
  vi.spyOn(btsApi, 'get').mockResolvedValue(연결);
  return render(<SettingsBts row={프로젝트} services={[앱]} onDone={vi.fn()} />);
}

describe('설정 › BTS 연결', () => {
  it('처음 연결 — 적은 토큰으로 상태를 불러와 고르고, 저장하면 자동 설정까지 하고 넷이 ✓ 로 선다', async () => {
    const 불러옴 = vi.spyOn(btsApi, 'choices').mockResolvedValue(목록);
    const 저장 = vi.spyOn(btsApi, 'save').mockResolvedValue({ ok: true });
    const 설정 = vi.spyOn(btsApi, 'setup').mockResolvedValue({ items: 다됨 });
    const 저장소 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    그리기(빈연결);

    fireEvent.change(await screen.findByLabelText('Issue Bunker 주소'), { target: { value: 'https://bts.example.com' } });
    fireEvent.change(screen.getByLabelText('Issue Bunker 프로젝트 키'), { target: { value: 'DM' } });
    fireEvent.change(screen.getByLabelText('「QA Hub AI」 계정 토큰'), { target: { value: 'pat_bot1' } });
    expect(불러옴).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Issue Bunker 에서 불러오기' }));
    await screen.findByText('Issue Bunker 에서 상태 6개 · 해결 사유 5개를 불러왔습니다');
    expect(불러옴).toHaveBeenCalledWith(3, 'https://bts.example.com', 'pat_bot1');

    const 검토칸 = screen.getByLabelText('QA 검토');
    expect(within(검토칸).getByRole('option', { name: 'QA Review' })).toBeTruthy();
    for (const [이름, 값] of [['배포 대기', 'ready'], ['QA 요청', 'qa-req'], ['QA 검토', 'qa-review'], ['개발 요청', 'todo'], ['코드 리뷰', 'review'], ['닫힘', 'done']] as const) {
      fireEvent.change(screen.getByLabelText(이름), { target: { value: 값 } });
    }
    for (const [이름, 값] of Object.entries({ '화면이 맞음': "Won't Fix", '테스트 문제': 'Test Issue', '흔들림': 'Flaky', '환경 문제': 'Environment', '중복': 'Duplicate' })) {
      fireEvent.change(screen.getByLabelText(이름), { target: { value: 값 } });
    }
    fireEvent.click(screen.getByRole('button', { name: '+ 저장소 추가' }));
    fireEvent.change(screen.getByLabelText('웹 저장소 1 이름'), { target: { value: '화면' } });
    fireEvent.change(screen.getByLabelText('웹 저장소 1 주소'), { target: { value: 'https://github.com/acme/web' } });

    fireEvent.click(screen.getByRole('button', { name: '저장하고 Issue Bunker 자동 설정' }));
    await waitFor(() => expect(설정).toHaveBeenCalledWith(3));
    expect(저장).toHaveBeenCalledWith(3, { baseUrl: 'https://bts.example.com', btsProject: 'DM', botKey: 'pat_bot1', statusMap: 상태, resolutionMap: 해결 });
    expect(저장소).toHaveBeenCalledWith(11, { codeRepos: [{ name: '화면', url: 'https://github.com/acme/web' }] });
    await waitFor(() => expect(document.querySelectorAll('.bts-checks li.ok')).toHaveLength(4));
  });

  it('이은 프로젝트는 열 때 저장한 토큰으로 불러온다 · 비운 단계가 있으면 저장하지 않는다', async () => {
    const 불러옴 = vi.spyOn(btsApi, 'choices').mockResolvedValue(목록);
    const 저장 = vi.spyOn(btsApi, 'save');
    그리기(이은연결);

    await waitFor(() => expect(불러옴).toHaveBeenCalledWith(3, 'https://bts.example.com', undefined));
    expect(await screen.findByText('연결됨 · DM')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('QA 검토'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: '저장하고 Issue Bunker 자동 설정' }));
    expect(await screen.findByText('비어 있는 단계가 있습니다. 모든 단계에 Issue Bunker 상태를 골라 주세요')).toBeTruthy();
    expect(저장).not.toHaveBeenCalled();
  });

  it('웹훅 권한이 없으면 그것만 ✕ 와 「권한 없음」 · 관리자에게 부탁하라는 줄', async () => {
    vi.spyOn(btsApi, 'choices').mockResolvedValue(목록);
    vi.spyOn(btsApi, 'save').mockResolvedValue({ ok: true });
    vi.spyOn(btsApi, 'setup').mockResolvedValue({ items: [{ what: 'WEBHOOK', ok: false, status: 403 }, ...다됨.slice(1)] });
    그리기(이은연결);

    fireEvent.click(await screen.findByRole('button', { name: '저장하고 Issue Bunker 자동 설정' }));
    expect(await screen.findByText('웹훅은 Issue Bunker 시스템 관리자만 만들 수 있습니다. 관리자에게 이 화면에서 다시 눌러 달라고 요청해 주세요')).toBeTruthy();
    expect(document.querySelectorAll('.bts-checks li.no')).toHaveLength(1);
    expect(screen.getByText('권한 없음')).toBeTruthy();
  });

  it('내 통합계정 토큰이 없으면 넣는 곳을 알려 준다', async () => {
    vi.spyOn(btsApi, 'choices').mockResolvedValue(목록);
    vi.spyOn(btsApi, 'save').mockResolvedValue({ ok: true });
    vi.spyOn(btsApi, 'setup').mockRejectedValue(new ApiError(400, 'NO_PERSONAL_TOKEN', '', []));
    그리기(이은연결);

    fireEvent.click(await screen.findByRole('button', { name: '저장하고 Issue Bunker 자동 설정' }));
    expect(await screen.findByText('내 계정에 통합계정 토큰이 없습니다. 왼쪽 아래 내 메뉴 › 통합계정 토큰에 넣은 뒤 다시 눌러 주세요')).toBeTruthy();
  });

  it('배포 알림 토큰을 발급하면 원문이 deploy.sh 한 줄에 공개 주소와 같이 들어간다', async () => {
    vi.spyOn(btsApi, 'choices').mockResolvedValue(목록);
    const 발급 = vi.spyOn(btsApi, 'deployKey').mockResolvedValue({ key: 'pdk_raw123' });
    그리기(이은연결);

    const 한줄 = () => document.querySelector('.bts-copy pre')?.textContent ?? '';
    await screen.findByText('발급 전 · 이 프로젝트 전용');
    expect(한줄()).toContain('Bearer <배포 알림 토큰>');
    fireEvent.click(screen.getByRole('button', { name: '발급' }));
    await screen.findByText('방금 발급했습니다 · 원문은 지금만 보입니다');
    expect(한줄()).toContain('Bearer pdk_raw123');
    expect(한줄()).toContain('https://qahub.example.com/api/projects/3/deploys');

    // 다시 발급은 deploy.sh 의 토큰을 끊으므로 묻는다
    fireEvent.click(screen.getByRole('button', { name: '다시 발급' }));
    const 창 = screen.getByRole('dialog');
    expect(발급).toHaveBeenCalledTimes(1);
    fireEvent.click(within(창).getByRole('button', { name: '다시 발급' }));
    await waitFor(() => expect(발급).toHaveBeenCalledTimes(2));
  });

  it('처음 연결에 토큰 없이 불러오기를 누르면 서버를 안 부르고 토큰을 넣으라고 한다', async () => {
    const 불러옴 = vi.spyOn(btsApi, 'choices');
    그리기(빈연결);

    fireEvent.click(await screen.findByRole('button', { name: 'Issue Bunker 에서 불러오기' }));
    expect(await screen.findByText('처음 연결할 때는 「QA Hub AI」 계정 토큰을 넣어야 합니다')).toBeTruthy();
    expect(불러옴).not.toHaveBeenCalled();
  });

  it('연결 해제는 확인 창을 거친다', async () => {
    vi.spyOn(btsApi, 'choices').mockResolvedValue(목록);
    const 끊음 = vi.spyOn(btsApi, 'remove').mockResolvedValue(undefined);
    그리기(이은연결);

    fireEvent.click(await screen.findByRole('button', { name: '연결 해제' }));
    expect(screen.getByText('연결을 해제하면 이 프로젝트의 실패 판정은 Test Commander 에서 합니다')).toBeTruthy();
    expect(끊음).not.toHaveBeenCalled();
    const 창 = screen.getByRole('dialog');
    fireEvent.click(within(창).getByRole('button', { name: '연결 해제' }));
    await waitFor(() => expect(끊음).toHaveBeenCalledWith(3));
    await waitFor(() => expect((screen.getByRole('button', { name: '저장하고 Issue Bunker 자동 설정' }) as HTMLButtonElement).disabled).toBe(false));
  });
});
