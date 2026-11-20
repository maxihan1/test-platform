import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-099',
  name: '행동 버튼에 손가락을 올려 두면 스킬 설명 말풍선이 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
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
    await 봇모두끄기(admin);
    await 던전으로(game, driver, 나, 0);
    await verify('던전 행동 막대가 보인다', await 던전화면.열기(game).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('「공격」 버튼에 손가락을 올려 둔다', async () => {
    const 던전 = new 던전화면(game);
    const 손가락 = await 던전.행동버튼눌러두기('공격');
    try {
      await verify('행동 버튼에 손가락을 올려 두면 스킬 설명 말풍선이 뜬다', await 던전.행동말풍선뜸(4_000), true);
    } finally {
      await 던전.손가락떼기(손가락);
    }
  });
});
