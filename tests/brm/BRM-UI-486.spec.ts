import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 감정표현막대 } from './pages/emote-bar.page.js';

export const spec = defineCase({
  tcId: 'BRM-UI-486',
  name: '감정 표현 막대에서 「CHEER」를 누르면 감정 표현 막대가 닫힌다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 있고 감정 표현 막대가 열려 있다'],
  elements: ['state:장소=던전'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('일반 회원이 혼자 던전에 들어간다', async () => {
    await 던전으로(game, driver, 나, 0);
    await verify('던전 행동 막대가 보인다', await 던전화면.열기(game).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('감정 표현 막대에서 「CHEER」를 누른다', async () => {
    const 막대 = await 감정표현막대.열기(game);
    await 막대.누르기(0);
    await verify('감정 표현 막대에서 「CHEER」를 누르면 감정 표현 막대가 닫힌다', await 막대.닫힐때까지(), true);
  });
});
