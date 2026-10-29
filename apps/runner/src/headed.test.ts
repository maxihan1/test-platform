import { afterEach, describe, expect, it, vi } from 'vitest';

type 실행옵션 = { slowMo?: number; args?: string[] };
async function 설정읽기(): Promise<{ use?: { headless?: boolean; launchOptions?: 실행옵션 }; projects?: { name?: string; use?: { launchOptions?: 실행옵션 } }[] }> {
  vi.resetModules();
  return (await import('../../../playwright.config.js')).default;
}

async function 시나리오설정읽기(): Promise<{ metadata?: { partTimeoutMs?: number } }> {
  vi.resetModules();
  return (await import('../scenario/playwright.config.js')).default;
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

  it('창을 띄우면 PC 창은 늘 같은 자리 · 크기로 열고, 늦추기도 그대로 싣는다 — E2E 단계마다 새 창이 같은 자리에 뜬다', async () => {
    vi.stubEnv('PLATFORM_HEADED', '1');
    vi.stubEnv('PLATFORM_SLOW_MO', '1000');
    const 설정 = await 설정읽기();
    const pc = 설정.projects?.find((p) => p.name === 'desktop')?.use?.launchOptions;
    expect(pc?.args).toEqual(['--window-position=0,0', '--window-size=1320,900']);
    expect(pc?.slowMo).toBe(1000);
    expect(설정.projects?.find((p) => p.name === 'mobile')?.use).not.toHaveProperty('launchOptions');
  });

  it('창을 안 띄우면 PC 창 자리를 정하지 않는다 — 컨테이너 러너는 그대로다', async () => {
    vi.stubEnv('PLATFORM_HEADED', '');
    expect((await 설정읽기()).projects?.find((p) => p.name === 'desktop')?.use).not.toHaveProperty('launchOptions');
  });
});

describe('PLATFORM_SLOW_MO', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('값이 있으면 동작마다 그만큼 쉰다', async () => {
    vi.stubEnv('PLATFORM_SLOW_MO', '1000');
    expect((await 설정읽기()).use?.launchOptions?.slowMo).toBe(1000);
  });

  it('없으면 브라우저 실행 옵션을 건드리지 않는다', async () => {
    vi.stubEnv('PLATFORM_SLOW_MO', '');
    expect((await 설정읽기()).use).not.toHaveProperty('launchOptions');
  });

  it('시나리오 부품 한도를 다섯 배로 늘린다 — 늦춘 시간이 30초 한도를 먹는다', async () => {
    vi.stubEnv('PLATFORM_SLOW_MO', '1000');
    expect((await 시나리오설정읽기()).metadata?.partTimeoutMs).toBe(150_000);
  });

  it('0 이나 숫자가 아닌 값은 늦추지도 한도를 늘리지도 않는다', async () => {
    for (const 값 of ['0', '1s']) {
      vi.stubEnv('PLATFORM_SLOW_MO', 값);
      expect((await 설정읽기()).use).not.toHaveProperty('launchOptions');
      expect((await 시나리오설정읽기()).metadata?.partTimeoutMs).toBe(30_000);
    }
  });

  it('늦추지 않으면 시나리오 부품 한도는 단독 실행과 같다', async () => {
    vi.stubEnv('PLATFORM_SLOW_MO', '');
    expect((await 시나리오설정읽기()).metadata?.partTimeoutMs).toBe(30_000);
  });
});
