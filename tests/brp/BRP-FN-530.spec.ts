import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 퀘스트처음으로 } from './helpers/items.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-530',
  name: '일일 퀘스트 창을 열면 퀘스트 줄에 진행 막대와 「/」로 이은 진행 글이 보인다',
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

  await test.step('일일 퀘스트 창을 연다', async () => {
    const 창 = await 퀘스트창.열기(game);
    const 줄 = (await 창.줄들())[0];
    await verify('퀘스트 줄이 보인다', 줄 !== undefined, true, { blocker: true });
    const 막대 = await verify('퀘스트 줄에 진행 막대가 보인다', 줄 === undefined ? false : await 창.진행막대있나(줄.주소), true);
    const 진행 = await verify('퀘스트 줄 진행 글이 「/」로 이어져 있다', /^\d+\/\d+$/.test(줄?.진행글 ?? ''), true);
    await verify('일일 퀘스트 창을 열면 퀘스트 줄에 진행 막대와 「/」로 이은 진행 글이 보인다', 막대 && 진행, true);
  });
});
