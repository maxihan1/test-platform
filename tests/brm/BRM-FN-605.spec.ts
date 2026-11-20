import { defineCase, test, verify } from '@platform/kit';
import { 뒤로보냈다오기 } from '@platform/kit/parts';
import { z } from 'zod';

import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-605',
  name: '던전에서 게임을 내렸다 올리면 접속이 이어져 던전 행동 막대가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
  techniques: ['오류 추정'],
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
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('게임을 내렸다 30초 뒤 올린다', async () => {
    const 던전 = await 던전화면.열기(game);
    await 뒤로보냈다오기(driver, 30);
    await verify('던전에서 게임을 내렸다 올리면 접속이 이어져 던전 행동 막대가 보인다', await 던전.행동막대다시뜰때까지(), true);
  });
});
