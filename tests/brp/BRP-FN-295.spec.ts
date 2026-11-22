import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상점에서사기, 퀘스트처음으로 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-295',
  name: '상점에서 구매에 성공하면 「상점에서 물건 구매」 진행이 1 오른다',
  platforms: ['windows'],
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

  await test.step('상점에서 「조약돌」을 산다', async () => {
    await 상점에서사기(game, ['조약돌']);
    const 퀘스트 = await 퀘스트창.열기(game);
    await 퀘스트.진행수가바뀔때까지('상점에서 물건 구매', 0);
    const 수 = await 퀘스트.진행수('상점에서 물건 구매');
    await 퀘스트.닫기();
    await verify('상점에서 구매에 성공하면 「상점에서 물건 구매」 진행이 1 오른다', 수, 1);
  });
});
