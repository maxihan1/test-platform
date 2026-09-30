import { afterEach, describe, expect, it, vi } from 'vitest';

async function 설정읽기(): Promise<{ use?: { headless?: boolean } }> {
  vi.resetModules();
  return (await import('../../../playwright.config.js')).default;
}

describe('PLATFORM_HEADED', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('1 이면 브라우저 창을 띄운다', async () => {
    vi.stubEnv('PLATFORM_HEADED', '1');
    expect((await 설정읽기()).use?.headless).toBe(false);
  });

  it('없으면 headless 를 건드리지 않는다 — 컨테이너 러너는 그대로다', async () => {
    vi.stubEnv('PLATFORM_HEADED', '');
    expect((await 설정읽기()).use).not.toHaveProperty('headless');
  });

  it('1 이 아닌 값도 창을 띄우지 않는다', async () => {
    vi.stubEnv('PLATFORM_HEADED', '0');
    expect((await 설정읽기()).use).not.toHaveProperty('headless');
  });
});
