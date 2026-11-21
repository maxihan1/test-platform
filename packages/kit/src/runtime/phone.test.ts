// 폰 게임 연결이 game.restart() 에 넘기는 끄고 켜기 — 시험 대상 앱 꾸러미만 Appium 으로 껐다 켜는지 본다

import { describe, expect, it, vi } from 'vitest';

const 부른: string[] = [];
const 드라이버 = {
  capabilities: { 'appium:appPackage': 'com.maxihan.bossroom' },
  terminateApp: async (꾸러미: string) => void 부른.push(`terminate ${꾸러미}`),
  activateApp: async (꾸러미: string) => void 부른.push(`activate ${꾸러미}`),
};
let 받은끄고켜기: (() => Promise<void>) | undefined;

vi.mock('./app.js', () => ({
  openApp: async () => 드라이버,
  readDevice: async () => undefined,
  closeApp: async () => undefined,
}));
vi.mock('./game.js', () => ({
  isGame: () => true,
  openGame: async (_env: unknown, _link: unknown, _쉬기: unknown, 끄고켜기: () => Promise<void>) => {
    받은끄고켜기 = 끄고켜기;
    return {};
  },
}));

const { 폰을연다 } = await import('./phone.js');

describe('폰을연다', () => {
  it('게임이면 시험 대상 앱 꾸러미를 Appium 으로 끄고 켜는 길을 openGame 에 넘긴다', async () => {
    await 폰을연다({ PLATFORM_ENGINE: 'GAME' });
    await 받은끄고켜기!();
    expect(부른).toEqual(['terminate com.maxihan.bossroom', 'activate com.maxihan.bossroom']);
  });
});
