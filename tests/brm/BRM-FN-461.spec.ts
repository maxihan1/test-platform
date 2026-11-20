import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 몬스터줄, 첫수치 } from './helpers/dungeon-tools.helper.js';
import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { GM자료, 계정꺼내기, 계정되돌리기, 레벨맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-461',
  name: '「/gm level 30」 뒤 「/gm data monster」를 보내면 레벨 30 이 되어도 「/gm data monster」의 임프 체력이 15 그대로다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
  elements: ['state:레벨=30', 'monster:임프'],
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
  await test.step('「/gm level 30」 뒤 「/gm data monster」를 보낸다', async () => {
    await 레벨맞추기(game, 30);
    const 줄들 = await GM자료(game, 'monster');
    await verify('「/gm level 30」 뒤 「/gm data monster」를 보내면 레벨 30 이 되어도 「/gm data monster」의 임프 체력이 15 그대로다', 첫수치(몬스터줄(줄들, '임프'), ['체력']), 15);
  });
});
