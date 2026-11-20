import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방채우기, 장착하기, 퀘스트줄 } from './helpers/items-tools.helper.js';
import { 던전으로, 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 적모두처치, 퀘스트처음으로 } from './helpers/game-state.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-293',
  name: '장비가 있어도 임프 24마리를 잡으면 「임프 30마리 처치」 진행이 「24/30」이다',
  platforms: ['android'],
  precondition: ['일반 회원이 현자의 목걸이를 끼고 혼자 던전에 들어와 있다'],
  elements: ['quest:임프 30마리 처치', 'item:현자의 목걸이', 'spawn:임프'],
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
  await test.step('일반 회원이 현자의 목걸이를 끼고 혼자 던전에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await 가방채우기(game, admin, 나, [{ 이름: '현자의 목걸이', 개수: 1 }]);
    await 장착하기(game, '현자의 목걸이');
    await 던전으로(game, driver, 나, 0);
    await verify('던전 화면이 열려 있다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('「/gm quest reset」 뒤 「/gm killall」로 임프 24마리를 잡는다', async () => {
    await 퀘스트처음으로(game);
    await 적모두처치(game);
    const 퀘스트 = await 퀘스트창.열기(game);
    const 줄 = await 퀘스트줄(퀘스트, '임프 30마리 처치');
    await 퀘스트.줄진행이될때까지(줄, '24/30');
    await verify('장비가 있어도 임프 24마리를 잡으면 「임프 30마리 처치」 진행이 「24/30」이다', await 퀘스트.줄진행(줄), '24/30');
  });
});
