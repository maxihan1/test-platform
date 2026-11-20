import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 골드가넘을때까지, 임프하나만두기 } from './helpers/dungeon-tools.helper.js';
import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 골드맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-116',
  name: '임프의 체력이 0 이 되면 바로 사라지고 상단 바의 골드가 는다',
  platforms: ['android'],
  smoke: true,
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
  elements: ['spawn:임프', 'rate:임프 골드'],
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
  await test.step('「/gm killall」 뒤 임프를 하나 불러 사라질 때까지 「공격」을 누른다', async () => {
    const 던전 = await 던전화면.열기(game);
    await 임프하나만두기(game);
    await 골드맞추기(game, 100);
    const 전 = await 던전.hud.골드값();
    const 사라짐 = await verify('임프가 사라진다', await 던전.임프사라질때까지치기(), true);
    const 후 = await 골드가넘을때까지(game, 전);
    const 골드 = await verify('상단 바의 골드가 는다', 후 > 전, true);
    await verify('임프의 체력이 0 이 되면 바로 사라지고 상단 바의 골드가 는다', 사라짐 && 골드, true);
  });
});
