import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 최대체력읽기 } from './helpers/login-tools.helper.js';
import { 지금화면, 던전으로 } from './helpers/game-enter.helper.js';
import { GM상태, 계정꺼내기, 계정되돌리기, 레벨맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-008',
  name: '「/gm level 10」을 보낸 뒤 「/gm stat」 셋째 줄의 체력을 읽으면 「/gm level 10」으로 레벨을 올려도 탱커의 체력 최대치는 1,200 그대로다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
  elements: ['class:탱커', 'level:10'],
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
  await test.step('「/gm level 10」을 보낸 뒤 「/gm stat」 셋째 줄의 체력을 읽는다', async () => {
    await 레벨맞추기(game, 10);
    const 상태 = await GM상태(game);
    await verify('「/gm level 10」을 보낸 뒤 「/gm stat」 셋째 줄의 체력을 읽으면 「/gm level 10」으로 레벨을 올려도 탱커의 체력 최대치는 1,200 그대로다', 최대체력읽기(상태['체력']), 1200);
  });
});
