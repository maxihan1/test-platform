// @vitest-environment jsdom
// 설정 › 애플리케이션 「CI 토큰」 구획 — 목록 · 만들기 · 예시 글 · 끊기 (도메인/실행 §3.11 · §7)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type CI토큰, type SettingsServiceRow } from './api.js';
import { CI토큰구획 } from './SettingsCiTokens.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 행 = (덮: Partial<SettingsServiceRow> = {}): SettingsServiceRow => ({
  id: 9,
  prefix: 'ZCI',
  name: '빌드 애플리케이션',
  color: '#3A5FCD', projectId: 1, projectName: '데모마켓',
  kind: 'GAME',
  envs: [
    { env: 'live', baseUrl: 'https://example.com', isProd: true },
    { env: 'qa', baseUrl: 'https://qa.example.com' },
    { env: 'stage', baseUrl: 'https://stage.example.com' },
  ],
  hasSlackWebhook: false,
  testsRepo: '',
  testsDir: 'zci',
  isActive: true,
  caseCount: 0,
  ...덮,
});

const 토큰 = (덮: Partial<CI토큰> = {}): CI토큰 => ({ tokenId: 4, name: 'github-main', createdBy: '김QA', createdAt: '2026-10-20T01:00:00Z', lastUsedAt: null, ...덮 });

async function 만든다(r: SettingsServiceRow) {
  vi.spyOn(api, 'serviceTokens').mockResolvedValue({ tokens: [] });
  const 만들기 = vi.spyOn(api, 'createServiceToken').mockResolvedValue({ tokenId: 5, token: 'cit_abc123' });
  render(<CI토큰구획 row={r} />);
  fireEvent.change(await screen.findByLabelText('토큰 이름'), { target: { value: 'github-main' } });
  fireEvent.click(screen.getByRole('button', { name: '토큰 만들기' }));
  await screen.findByText('cit_abc123');
  return 만들기;
}

describe('설정 › CI 토큰', () => {
  it('목록에 이름과 「쓴 적 없음」이 보인다', async () => {
    vi.spyOn(api, 'serviceTokens').mockResolvedValue({ tokens: [토큰()] });
    render(<CI토큰구획 row={행()} />);
    const 줄 = (await screen.findByText('github-main')).closest('tr')!;
    expect(줄.textContent).toContain('김QA');
    expect(줄.textContent).toContain('쓴 적 없음');
  });

  it('만들면 이름과 함께 부르고 토큰을 보이며, 게임 예시에 APK 올리기 · 주소 · 첫 비실서비스 서버가 든다', async () => {
    const 만들기 = await 만든다(행());
    expect(만들기).toHaveBeenCalledWith(9, 'github-main');
    const 예시 = document.querySelector('pre')!.textContent!;
    expect(예시).toContain('--data-binary');
    expect(예시).toContain('octet-stream');
    expect(예시).toContain(`${window.location.origin}/api/builds?env=qa&buildNo=`);
    expect(예시).toContain('${{ secrets.QAHUB_TOKEN }}');
    fireEvent.click(screen.getByRole('button', { name: '그 밖의 CI (curl)' }));
    expect(document.querySelector('pre')!.textContent).toContain('$QAHUB_TOKEN');
    fireEvent.click(screen.getByRole('button', { name: '적었습니다' }));
    expect(screen.queryByText('cit_abc123')).toBeNull();
  });

  it('화면 종류 예시에는 파일 올리기 줄이 없다', async () => {
    await 만든다(행({ kind: 'SCREEN' }));
    const 예시 = document.querySelector('pre')!.textContent!;
    expect(예시).not.toContain('--data-binary');
    expect(예시).not.toContain('octet-stream');
    expect(예시).toContain('/api/builds?env=qa');
  });

  it('실서비스 줄은 대상 서버 고르개에 없다', async () => {
    await 만든다(행());
    const 옵션 = [...screen.getByLabelText('대상 서버').querySelectorAll('option')].map((o) => o.textContent);
    expect(옵션).toEqual(['qa', 'stage']);
  });

  it('「끊기」 뒤 「끊는다」를 눌러야 끊고 목록을 다시 읽는다', async () => {
    const 읽기 = vi.spyOn(api, 'serviceTokens').mockResolvedValue({ tokens: [토큰()] });
    const 끊기 = vi.spyOn(api, 'revokeServiceToken').mockResolvedValue(undefined);
    render(<CI토큰구획 row={행()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'github-main 끊기' }));
    expect(끊기).not.toHaveBeenCalled();
    expect(screen.getByText('이 토큰을 쓰는 CI 는 다음 빌드부터 올리지 못합니다')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '끊는다' }));
    await waitFor(() => expect(끊기).toHaveBeenCalledWith(9, 4));
    await waitFor(() => expect(읽기).toHaveBeenCalledTimes(2));
  });

  it('이름이 비면 서버에 보내지 않는다', async () => {
    vi.spyOn(api, 'serviceTokens').mockResolvedValue({ tokens: [] });
    const 만들기 = vi.spyOn(api, 'createServiceToken');
    render(<CI토큰구획 row={행()} />);
    fireEvent.click(await screen.findByRole('button', { name: '토큰 만들기' }));
    expect((await screen.findByRole('alert')).textContent).toBe('토큰 이름을 적어 주세요');
    expect(만들기).not.toHaveBeenCalled();
  });
});
