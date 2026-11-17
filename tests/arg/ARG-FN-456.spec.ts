import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 상태읽기 } from './helpers/game-state.helper.js';
import { 조건될때까지, 우편넣기, 우편받기 } from './helpers/economy.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-456',
  name: '가방에서 장비를 장착한 뒤 게임을 끄고 다시 켜 로그인하면 장착한 장비가 그대로 장착 칸에 있다',
  platforms: ['android'],
  precondition: ['「녹슨 단검」을 가진 일반 회원이 가방 창을 열었다'],
  techniques: ['오류 추정'],
  elements: ['item:rusty_dagger'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, driver, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 「녹슨 단검」을 받아 가방 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-FN-456', [{ 이름: '녹슨 단검', 개수: 1 }]);
      await 로비로(game, 아이디, 비밀번호);
      await 우편받기(game, 'ARG-FN-456');
      await 가방창.열기(game);
    });
    await test.step('가방에 「녹슨 단검」 줄이 있는지 확인한다', async () => {
      await verify('가방에 「녹슨 단검」 줄이 있다', (await 가방창.지금(game).목록.이름줄('녹슨 단검')) !== null, true, { blocker: true });
    });
    await test.step('「녹슨 단검」을 장착한 뒤 게임을 끄고 다시 켜 로그인한다', async () => {
      const 가방 = 가방창.지금(game);
      await 가방.장착('녹슨 단검');
      await 조건될때까지(async () => (await 가방.장착칸글('무기')).includes('녹슨 단검'));
      await 가방.닫기누르기();
      await 조건될때까지(async () => (await 상태읽기(game))['저장대기'] === '아니오', 30_000);
      await driver.terminateApp('com.maxihan.bossroom');
      await driver.activateApp('com.maxihan.bossroom');
      await game.waitForValue(로그인화면.게임시작, 'Button.interactable', true, { timeoutMs: 120_000 });
      await 로그인화면.열기(game);
      await 로비로(game, 아이디, 비밀번호);
      const 다시 = await 가방창.열기(game);
      await verify('가방에서 장비를 장착한 뒤 게임을 끄고 다시 켜 로그인하면 장착한 장비가 그대로 장착 칸에 있다', (await 다시.장착칸글('무기')).includes('녹슨 단검'), true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
