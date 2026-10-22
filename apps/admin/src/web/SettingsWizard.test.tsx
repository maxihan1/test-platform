// @vitest-environment jsdom
// 설정 마법사 검사 (도메인/인증 §8.8 「새로 만들기 마법사」 · 2026-10-23 사용자 시안 C). 단계 넘기기 · 막기 · 만드는 차례 · 나가기 — 종류마다 다른 칸과 끝 화면은 SettingsWizard.kinds.test.tsx

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, ApiError } from './api.js';
import { useHash, 떠나기막기 } from './leaveGuard.js';
import { prdApi } from './prdApi.js';
import { SettingsWizard } from './SettingsWizard.js';
import { 그린다, 까닭, 다음, 단계들, 서버를더한다, 이름을채운다, 종류를고른다, 종류카드들, 확인까지 } from './SettingsWizard.fixture.js';

afterEach(() => {
  떠나기막기(null);
  cleanup();
  vi.restoreAllMocks();
});

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
    확인까지();

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
    확인까지();
    fireEvent.click(screen.getByRole('button', { name: '만들기' }));

    await waitFor(() => expect(screen.getByText('이름과 번호를 정합니다')).toBeTruthy());
    expect(까닭()).toBe('그 접두사는 이미 다른 애플리케이션이 쓰고 있습니다');
  });

  it('웹에서 탐색 제외 경로를 적고 종류를 바꾸면 그 칸은 검사도 하지 않고 보내지도 않는다', async () => {
    const 만듦 = vi.spyOn(api, 'createService').mockResolvedValue({ id: 9 });
    그린다();
    확인까지();
    fireEvent.click(screen.getByRole('button', { name: '알림 · 작성 도구 고치기' }));
    fireEvent.change(screen.getByLabelText('탐색 제외 경로'), { target: { value: 'daejeon' } });
    fireEvent.click(screen.getByRole('button', { name: '종류' }));
    종류를고른다('Android 앱');
    for (let i = 0; i < 4; i += 1) 다음();

    expect(screen.getByText('이대로 만듭니다')).toBeTruthy();
    expect(screen.queryByText(/탐색 제외 경로 \d+줄/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '만들기' }));
    await waitFor(() => expect(만듦).toHaveBeenCalledTimes(1));
    expect(만듦.mock.calls[0]?.[0]).toMatchObject({ kind: 'APP', crawlExclude: [] });
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
    expect(document.querySelector('.wz-step .err')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '프로젝트' }));
    expect((screen.getByLabelText('프로젝트 이름') as HTMLInputElement).disabled).toBe(true);
    for (let i = 0; i < 5; i += 1) 다음();
    fireEvent.click(screen.getByRole('button', { name: '만들기' }));

    expect(await screen.findByText('쇼핑 앱 애플리케이션을 만들었습니다')).toBeTruthy();
    expect(screen.getByText(/「새 제품」 프로젝트도 함께 만들었습니다/)).toBeTruthy();
    expect(프로젝트만듦).toHaveBeenCalledTimes(1);
    expect(만듦.mock.calls[1]?.[0]).toMatchObject({ projectId: 7, kind: 'APP' });
  });
});

function 주소보기() {
  return <p data-testid="hash">{useHash()}</p>;
}

function 빈마법사() {
  render(
    <>
      <주소보기 />
      <SettingsWizard 새프로젝트 projects={[]} services={[]} 나가는곳="#/settings/users"
        on만듦={() => {}} 고를수있나={() => true} 내프로젝트={() => true} on작성={() => {}} on설정={() => {}} />
    </>,
  );
}

async function 주소가바뀐다(바꾼다: () => void) {
  const 도착 = new Promise<void>((끝) => window.addEventListener('hashchange', () => 끝(), { once: true }));
  await act(async () => {
    바꾼다();
    await 도착;
  });
}

describe('나가기 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)', () => {
  it('적은 것이 있으면 나가기 전에 묻는다', async () => {
    window.history.replaceState(null, '', '#/settings/new');
    빈마법사();
    fireEvent.change(screen.getByLabelText('프로젝트 이름'), { target: { value: '새 제품' } });
    await 주소가바뀐다(() => {
      window.location.hash = '#/settings/users';
    });

    expect(await screen.findByText('저장 안 된 변경 있음')).toBeTruthy();
  });

  it('Esc 는 「나가기」다', async () => {
    window.history.replaceState(null, '', '#/settings/new');
    빈마법사();
    await 주소가바뀐다(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    expect(screen.getByTestId('hash').textContent).toBe('#/settings/users');
  });
});
