import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { GM상태, 계정꺼내기, 계정되돌리기, 봇모두끄기, 체력맞추기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-192',
  name: '체력 100 인 탱커가 체력 물약을 쓰면 체력이 600 회복돼 「/gm stat」 체력이 「700/1200」이다',
  platforms: ['android'],
  smoke: true,
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
  elements: ['item:체력 물약', 'class:탱커'],
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
  await test.step('일반 회원이 탱커로 혼자 던전에 들어간다', async () => {
    await 던전으로(game, driver, 나, 0);
    const 상태 = await GM상태(game);
    await verify('직업이 탱커다', 상태['직업'], '탱커', { blocker: true });
  });
  await test.step('「/gm hp 100」 뒤 「물약」 버튼을 누른다', async () => {
    const 던전 = await 던전화면.열기(game);
    await 체력맞추기(game, 100);
    await 던전.hud.물약누르기();
    await 던전.hud.알림뜸('체력 물약 사용');
    const 상태 = await GM상태(game);
    await verify('체력 100 인 탱커가 체력 물약을 쓰면 체력이 600 회복돼 「/gm stat」 체력이 「700/1200」이다', 상태['체력'], '700/1200');
  });
});
