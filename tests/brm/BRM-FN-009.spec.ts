import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 퀘스트진행수, 퀘스트진행이오를때까지 } from './helpers/login-tools.helper.js';
import { 지금화면, 던전으로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 불러내기, 적모두처치, 퀘스트처음으로 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-009',
  name: '던지는 임프를 처치하면 「임프 30마리 처치」 퀘스트 진행이 1 오른다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
  elements: ['monster:던지는 임프', 'quest:임프 30마리 처치'],
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
  await test.step('「/gm killall」 뒤 「/gm spawn thrower」로 던지는 임프를 불러 처치한다', async () => {
    await 적모두처치(game);
    await 퀘스트처음으로(game);
    const 전 = await 퀘스트진행수(game, '임프 30마리 처치');
    await verify('처치하기 전 「임프 30마리 처치」 진행이 0 이다', 전, 0, { blocker: true });
    await 불러내기(game, 'thrower');
    await 적모두처치(game);
    const 후 = await 퀘스트진행이오를때까지(game, '임프 30마리 처치', 0);
    await verify('던지는 임프를 처치하면 「임프 30마리 처치」 퀘스트 진행이 1 오른다', (후 ?? 0) - (전 ?? 0), 1);
  });
});
