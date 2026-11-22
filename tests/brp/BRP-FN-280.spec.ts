import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 퀘스트처음으로 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-280',
  name: '일일 퀘스트 창을 열면 오늘 진행을 처음으로 돌린 퀘스트 3종은 진행 0 이고 「보상 받기」가 눌리지 않는다',
  platforms: ['windows'],
  smoke: true,
  precondition: ['일반 회원으로 로그인해 로비에 있고 오늘 일일 퀘스트를 처음으로 돌려 두었다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('일반 회원을 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('오늘 일일 퀘스트를 처음으로 돌려 둔 것을 확인한다', async () => {
    const 글 = await 퀘스트처음으로(game);
    await verify('퀘스트 진행이 모두 0 에서 시작한다', 글.split(' · ').every((칸) => 칸.startsWith('0/')), true, { blocker: true });
  });

  await test.step('일일 퀘스트 창을 연다', async () => {
    const 퀘스트 = await 퀘스트창.열기(game);
    const 줄들 = await 퀘스트.줄들();
    const 눌림들: (boolean | undefined)[] = [];
    for (const 줄 of 줄들) 눌림들.push(await 퀘스트.받기눌림(줄.이름));
    await 퀘스트.닫기();
    const 진행 = await verify('퀘스트 3종의 진행이 모두 0 이다', 줄들.length === 3 && 줄들.every((줄) => 줄.진행글.startsWith('0/')), true);
    const 잠김 = await verify('퀘스트 3종의 「보상 받기」가 모두 눌리지 않는다', 눌림들, [false, false, false]);
    await verify('일일 퀘스트 창을 열면 오늘 진행을 처음으로 돌린 퀘스트 3종은 진행 0 이고 「보상 받기」가 눌리지 않는다', 진행 && 잠김, true);
  });
});
