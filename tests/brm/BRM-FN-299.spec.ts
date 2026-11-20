import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇과던전으로, 퀘스트줄 } from './helpers/items-tools.helper.js';
import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇기록, 봇기록기다리기, 봇모두끄기, 봇시키기, 봇줄글, 적모두처치, 퀘스트처음으로, GM상태 } from './helpers/game-state.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-299',
  name: '임프를 잡으면 「임프 30마리 처치」 진행이 잡은 수만큼 오른다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다', '두 번째 플레이어 봇과 함께 던전에 들어와 있다'],
  elements: ['quest:임프 30마리 처치', 'spawn:임프'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 둘째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  let 봇 = '';
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 · 두 번째 플레이어 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 둘째);
  });
  await test.step('일반 회원이 혼자 던전에 들어간다', async () => {
    await 던전으로(game, driver, 나, 0);
    await verify('던전 화면이 열려 있다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('「/gm quest reset」 뒤 「/gm killall」로 임프를 잡는다', async () => {
    await 퀘스트처음으로(game);
    const 전 = Number((await GM상태(game))['처치'] ?? '0');
    await 적모두처치(game);
    const 후 = Number((await GM상태(game))['처치'] ?? '0');
    const 퀘스트 = await 퀘스트창.열기(game);
    const 줄 = await 퀘스트줄(퀘스트, '임프 30마리 처치');
    await 퀘스트.줄진행이될때까지(줄, String(후 - 전) + '/30');
    await verify('임프를 잡으면 「임프 30마리 처치」 진행이 잡은 수만큼 오른다', await 퀘스트.줄진행(줄), String(후 - 전) + '/30');
  });
  await test.step('일반 회원이 두 번째 플레이어 봇과 함께 던전에 들어간다', async () => {
    봇 = await 봇과던전으로(game, driver, admin, 나, 둘째);
    await verify('던전 화면이 열려 있다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('「/gm killall」로 임프를 잡은 뒤 봇에게 「/gm stat」을 시킨다', async () => {
    await 적모두처치(game);
    await 봇기록(admin, 봇, true);
    await 봇시키기(admin, 봇, 'gm:stat');
    const 줄 = await 봇기록기다리기(admin, 봇, (항목) => 봇줄글(항목).includes('처치='), 20_000);
    const 처치수 = Number(/(?:^|\s)처치=(\d+)/.exec(줄 === null ? '' : 봇줄글(줄))?.[1] ?? '0');
    await verify('같이 접속한 봇의 「임프 30마리 처치」 진행도 오른다', 처치수 > 0, true);
  });
});
