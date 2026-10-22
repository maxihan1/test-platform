// @vitest-environment jsdom
// 설정 마법사 검사 (도메인/인증 §8.8 「새로 만들기 마법사」 · 2026-10-23 사용자 시안 C). 프로젝트 · 애플리케이션 만들기와 단계 넘기기

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, ApiError, type SettingsServiceRow } from './api.js';
import { useHash, 떠나기막기 } from './leaveGuard.js';
import { prdApi } from './prdApi.js';
import { SettingsWizard } from './SettingsWizard.js';

afterEach(() => {
  떠나기막기(null);
  cleanup();
  vi.restoreAllMocks();
});

const 프로젝트들 = [
  { id: 1, name: '데모마켓' },
  { id: 2, name: '사내 포털' },
];

const 있는앱: SettingsServiceRow = {
  id: 5,
  prefix: 'MKW',
  name: '데모마켓 웹',
  color: '#3A5FCD', projectId: 1, projectName: '데모마켓',
  envs: [],
  hasSlackWebhook: false,
  testsRepo: '',
  testsDir: 'mkw',
  isActive: true,
  caseCount: 0,
};

function 그린다(덧: { 새프로젝트?: boolean; 기본프로젝트?: number; 고를수있나?: (번호: number) => boolean } = {}) {
  const 끝 = { on만듦: vi.fn(), on작성: vi.fn(), on설정: vi.fn() };
  render(
    <SettingsWizard
      새프로젝트={덧.새프로젝트 ?? false}
      projects={프로젝트들}
      services={[있는앱]}
      기본프로젝트={덧.기본프로젝트}
      나가는곳="#/settings/MKW"
      고를수있나={덧.고를수있나 ?? (() => true)}
      {...끝}
    />,
  );
  return 끝;
}

const 다음 = () => fireEvent.click(screen.getByRole('button', { name: '다음' }));
const 종류카드들 = () => within(screen.getByRole('group', { name: '종류' })).getAllByRole('button');
const 종류를고른다 = (이름: string) => fireEvent.click(종류카드들().find((it) => it.querySelector('.wz-kind-h')?.textContent === 이름)!);
const 까닭 = () => screen.getByRole('alert').textContent;
const 단계들 = () => [...document.querySelectorAll('.wz-steps .wz-stepbtn')].map((it) => it.textContent);

function 이름을채운다(접두사: string, 이름: string) {
  fireEvent.change(screen.getByLabelText('접두사'), { target: { value: 접두사 } });
  fireEvent.change(screen.getByLabelText('이름'), { target: { value: 이름 } });
}

function 서버를더한다(키: string, 주소: string) {
  fireEvent.click(screen.getByRole('button', { name: '+ 대상 서버 추가' }));
  fireEvent.change(screen.getByLabelText('대상 서버 1 키'), { target: { value: 키 } });
  fireEvent.change(screen.getByLabelText('대상 서버 1 주소'), { target: { value: 주소 } });
}

describe('애플리케이션만 더하기', () => {
  it('프로젝트 → 종류 → 이름 · 번호 → 대상 서버 → 알림 · 작성 도구 → 확인 차례로 넘기고, 만들면 고른 것을 보내고 끝 화면을 보인다', async () => {
    const 만듦 = vi.spyOn(api, 'createService').mockResolvedValue({ id: 9 });
    const 프로젝트만듦 = vi.spyOn(api, 'createProject');
    const 끝 = 그린다({ 기본프로젝트: 2 });

    expect(screen.getByRole('dialog', { name: '새 애플리케이션' })).toBeTruthy();
    expect(단계들()).toEqual(['1프로젝트', '2종류', '3이름 · 번호', '4대상 서버', '5알림 · 작성 도구', '6확인']);
    expect(screen.getByRole('button', { name: /사내 포털/ }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: /데모마켓/ }));
    다음();

    expect(종류카드들().map((it) => it.querySelector('.wz-kind-h')?.textContent)).toEqual(['웹', 'Android 앱', '게임', 'API']);
    종류를고른다('웹');
    다음();

    이름을채운다('pay', '결제 서비스');
    expect((screen.getByLabelText('접두사') as HTMLInputElement).value).toBe('PAY');
    expect((screen.getByLabelText('테스트 폴더') as HTMLInputElement).value).toBe('pay');
    다음();

    서버를더한다('qa', 'https://qa.example.com');
    다음();

    fireEvent.change(screen.getByLabelText('탐색 제외 경로'), { target: { value: '/daejeon' } });
    다음();

    expect(screen.getByText('이대로 만듭니다')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '만들기' }));

    expect(await screen.findByText('결제 서비스 애플리케이션을 만들었습니다')).toBeTruthy();
    expect(프로젝트만듦).not.toHaveBeenCalled();
    const 본문 = 만듦.mock.calls[0]?.[0];
    expect(본문).toMatchObject({ projectId: 1, prefix: 'PAY', name: '결제 서비스', kind: 'SCREEN', testsDir: 'pay', crawlExclude: ['/daejeon'] });
    expect(본문?.envs[0]).toMatchObject({ env: 'qa', baseUrl: 'https://qa.example.com' });
    expect(본문).not.toHaveProperty('apiDocPath');
    expect(본문).not.toHaveProperty('slackWebhook');
    expect(끝.on만듦).toHaveBeenCalledTimes(1);
  });

  it('막히면 넘어가지 않고 까닭을 말한다 — 종류를 안 골랐을 때 · 접두사 모양 · 이미 쓰는 접두사', () => {
    그린다();
    다음();

    다음();
    expect(까닭()).toBe('무엇을 테스트할지 하나 골라 주세요');
    종류를고른다('Android 앱');
    다음();

    이름을채운다('1AB', '앱');
    다음();
    expect(까닭()).toContain('대문자로 시작하는');
    이름을채운다('MKW', '앱');
    다음();
    expect(까닭()).toBe('이미 「데모마켓 웹」에서 쓰는 접두사입니다. 다른 접두사를 적어 주세요');
    expect(screen.getByText('이름과 번호를 정합니다')).toBeTruthy();
  });

  it('대상 서버 단계는 PRD 를 읽지 않는다 — 아직 없는 애플리케이션이다', () => {
    const 읽음 = vi.spyOn(prdApi, 'now');
    그린다();
    다음();
    종류를고른다('웹');
    다음();
    이름을채운다('PAY', '결제');
    다음();

    expect(screen.getByRole('button', { name: '+ 대상 서버 추가' })).toBeTruthy();
    expect(읽음).not.toHaveBeenCalled();
  });

  it('지나온 단계는 왼쪽 목록에서 눌러 돌아가고, 확인 표의 「고치기」도 그 단계로 데려간다', () => {
    그린다();
    다음();
    종류를고른다('웹');
    다음();
    이름을채운다('PAY', '결제');
    다음();
    다음();
    다음();

    fireEvent.click(screen.getByRole('button', { name: '종류 고치기' }));
    expect(screen.getByText('무엇을 테스트할지 고릅니다')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /이름 · 번호/ }));
    expect(screen.getByText('무엇을 테스트할지 고릅니다')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '프로젝트' }));
    expect(screen.getByText('애플리케이션을 넣을 프로젝트를 고릅니다')).toBeTruthy();
  });

  it('그사이 다른 사람이 접두사를 쓰면(409 PREFIX_TAKEN) 이름 · 번호 단계로 데려가 까닭을 말한다', async () => {
    vi.spyOn(api, 'createService').mockRejectedValue(new ApiError(409, 'PREFIX_TAKEN', 'taken'));
    그린다();
    다음();
    종류를고른다('웹');
    다음();
    이름을채운다('PAY', '결제');
    다음();
    다음();
    다음();
    fireEvent.click(screen.getByRole('button', { name: '만들기' }));

    await waitFor(() => expect(screen.getByText('이름과 번호를 정합니다')).toBeTruthy());
    expect(까닭()).toBe('그 접두사는 이미 다른 애플리케이션이 쓰고 있습니다');
  });
});

describe('종류마다 다른 칸', () => {
  it('API 를 고르면 API 문서 단계가 끼고 문서 경로 · 기준 서버 · 비밀값이 든 API 인증을 보낸다', async () => {
    const 만듦 = vi.spyOn(api, 'createService').mockResolvedValue({ id: 9 });
    그린다();
    다음();
    종류를고른다('API');
    expect(단계들()).toContain('5API 문서');
    다음();
    이름을채운다('NOTI', '알림');
    다음();
    서버를더한다('qa', 'https://qa.example.com');
    fireEvent.click(screen.getByRole('button', { name: '대상 서버 1 API 인증 추가' }));
    const 칸 = (이름: string) => screen.getByLabelText(`대상 서버 1 API 인증 1 ${이름}`);
    fireEvent.change(칸('이름'), { target: { value: '고객사 A' } });
    fireEvent.change(칸('토큰 주소'), { target: { value: '/oauth/token' } });
    fireEvent.change(칸('클라이언트 ID'), { target: { value: 'client-a' } });
    fireEvent.change(칸('비밀값'), { target: { value: 'secret-123456789' } });
    다음();
    fireEvent.change(screen.getByLabelText('문서 경로'), { target: { value: '/openapi.json' } });
    fireEvent.change(screen.getByLabelText('기준 서버'), { target: { value: 'qa' } });
    다음();
    expect(screen.queryByLabelText('탐색 제외 경로')).toBeNull();
    다음();
    fireEvent.click(screen.getByRole('button', { name: '만들기' }));

    await waitFor(() => expect(만듦).toHaveBeenCalledTimes(1));
    const 본문 = 만듦.mock.calls[0]?.[0];
    expect(본문).toMatchObject({ kind: 'API', apiDocPath: '/openapi.json', apiDocEnv: 'qa' });
    expect(본문?.envs[0]?.apiAuths).toEqual([{ name: '고객사 A', tokenUrl: '/oauth/token', clientId: 'client-a', clientSecret: 'secret-123456789' }]);
  });

  it('게임을 고르면 대상 서버 줄에 어드민 키 칸이 서고 adminKey 를 보낸다', async () => {
    const 만듦 = vi.spyOn(api, 'createService').mockResolvedValue({ id: 9 });
    그린다();
    다음();
    종류를고른다('게임');
    다음();
    이름을채운다('ASH', 'Ashveil');
    다음();
    서버를더한다('qa', 'https://qa.ashveil.dev');
    fireEvent.change(screen.getByLabelText('대상 서버 1 어드민 키 머리 이름'), { target: { value: 'X-Admin-Key' } });
    fireEvent.change(screen.getByLabelText('대상 서버 1 어드민 키 값'), { target: { value: 'secret-admin-0001' } });
    다음();
    다음();
    fireEvent.click(screen.getByRole('button', { name: '만들기' }));

    await waitFor(() => expect(만듦).toHaveBeenCalledTimes(1));
    const 본문 = 만듦.mock.calls[0]?.[0];
    expect(본문?.kind).toBe('GAME');
    expect(본문?.envs[0]?.adminKey).toEqual({ header: 'X-Admin-Key', value: 'secret-admin-0001' });
    expect(본문?.envs[0]).not.toHaveProperty('apiAuths');
  });
});

describe('프로젝트부터 만들기', () => {
  it('프로젝트를 먼저 만들고 그 번호로 애플리케이션을 만든다 — 애플리케이션이 실패해 다시 눌러도 프로젝트를 또 만들지 않는다', async () => {
    const 프로젝트만듦 = vi.spyOn(api, 'createProject').mockResolvedValue({ id: 7 });
    const 만듦 = vi
      .spyOn(api, 'createService')
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL', '서버 오류'))
      .mockResolvedValueOnce({ id: 9 });
    const 끝 = 그린다({ 새프로젝트: true });

    expect(screen.getByRole('dialog', { name: '새 프로젝트' })).toBeTruthy();
    다음();
    expect(까닭()).toBe('프로젝트 이름을 입력해 주세요');
    fireEvent.change(screen.getByLabelText('프로젝트 이름'), { target: { value: ' 새 제품 ' } });
    다음();
    종류를고른다('Android 앱');
    다음();
    이름을채운다('APP', '쇼핑 앱');
    다음();
    다음();
    다음();
    fireEvent.click(screen.getByRole('button', { name: '만들기' }));

    await waitFor(() => expect(만듦).toHaveBeenCalledTimes(1));
    expect(프로젝트만듦).toHaveBeenCalledWith('새 제품');
    expect(끝.on만듦).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '만들기' }));

    expect(await screen.findByText('쇼핑 앱 애플리케이션을 만들었습니다')).toBeTruthy();
    expect(screen.getByText(/「새 제품」 프로젝트도 함께 만들었습니다/)).toBeTruthy();
    expect(프로젝트만듦).toHaveBeenCalledTimes(1);
    expect(만듦.mock.calls[1]?.[0]).toMatchObject({ projectId: 7, kind: 'APP' });
  });
});

describe('끝 화면', () => {
  async function 다만든다() {
    vi.spyOn(api, 'createService').mockResolvedValue({ id: 9 });
    다음();
    종류를고른다('웹');
    다음();
    이름을채운다('PAY', '결제');
    다음();
    다음();
    다음();
    fireEvent.click(screen.getByRole('button', { name: '만들기' }));
    await screen.findByText('결제 애플리케이션을 만들었습니다');
  }

  it('맨 위 고르개에 있으면 「테스트 작성 시작」 이 그 애플리케이션 번호를, 「설정 열기」 가 접두사를 넘긴다', async () => {
    const 끝 = 그린다();
    await 다만든다();

    fireEvent.click(screen.getByRole('button', { name: '테스트 작성 시작' }));
    expect(끝.on작성).toHaveBeenCalledWith(9);
    fireEvent.click(screen.getByRole('button', { name: '설정 열기' }));
    expect(끝.on설정).toHaveBeenCalledWith('PAY');
  });

  it('나에게 배정 안 된 프로젝트면 작성으로 바로 못 가서 배정하는 길을 말한다', async () => {
    그린다({ 고를수있나: () => false });
    await 다만든다();

    expect(screen.queryByRole('button', { name: '테스트 작성 시작' })).toBeNull();
    expect(screen.getByText('맨 위 고르개에서 고르려면 「계정」에서 이 프로젝트를 나에게 배정합니다')).toBeTruthy();
  });
});

function 주소보기() {
  return <p data-testid="hash">{useHash()}</p>;
}

describe('적다 만 마법사 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)', () => {
  it('적은 것이 있으면 나가기 전에 묻는다', async () => {
    window.history.replaceState(null, '', '#/settings/new');
    render(
      <>
        <주소보기 />
        <SettingsWizard 새프로젝트 projects={[]} services={[]} 나가는곳="#/settings/users" on만듦={() => {}} 고를수있나={() => true} on작성={() => {}} on설정={() => {}} />
      </>,
    );
    fireEvent.change(screen.getByLabelText('프로젝트 이름'), { target: { value: '새 제품' } });
    const 도착 = new Promise<void>((끝) => window.addEventListener('hashchange', () => 끝(), { once: true }));
    await act(async () => {
      window.location.hash = '#/settings/users';
      await 도착;
    });

    expect(await screen.findByText('저장 안 된 변경 있음')).toBeTruthy();
  });
});
