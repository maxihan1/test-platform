import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 초록인가, 퀘스트처음으로 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { GM퀘스트완료 } from './helpers/gm.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-291',
  name: '보상을 받으면 그 줄 버튼 자리에 초록 「받음」이 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원이 /gm quest done 으로 오늘 퀘스트 목표를 채웠다'],
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

  await test.step('오늘 퀘스트 목표를 채운 것을 확인한다', async () => {
    await 퀘스트처음으로(game);
    await GM퀘스트완료(game);
    const 퀘스트 = await 퀘스트창.열기(game);
    await verify('「상점에서 물건 구매」 진행이 「1/1」이다', await 퀘스트.진행글('상점에서 물건 구매'), '1/1', { blocker: true });
    await 퀘스트.닫기();
  });

  await test.step('「상점에서 물건 구매」 줄의 「보상 받기」를 누른다', async () => {
    const 퀘스트 = await 퀘스트창.열기(game);
    await 퀘스트.보상받기('상점에서 물건 구매');
    const 받음 = await 퀘스트.받음이될때까지('상점에서 물건 구매');
    const 색 = await 퀘스트.받음글원색('상점에서 물건 구매');
    await 퀘스트.닫기();
    const 글 = await verify('그 줄 버튼 자리에 「받음」이 보인다', 받음, true);
    const 초록 = await verify('「받음」 글자 색이 초록이다', 초록인가(색), true);
    await verify('보상을 받으면 그 줄 버튼 자리에 초록 「받음」이 보인다', 글 && 초록, true);
  });
});
