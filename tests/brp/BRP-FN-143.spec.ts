import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 장비끼기 } from './helpers/items.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { GM골드, GM스탯, GM퀘스트리셋, GM퀘스트완료, 색글떼기, 스탯숫자 } from './helpers/gm.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-143',
  name: '그 퀘스트의 「보상 받기」를 누르면 경험치 장비를 끼고 퀘스트 보상을 받아도 경험치가 보상 그대로 50 만 는다',
  platforms: ['windows'],
  precondition: ['일반 회원이 「현자의 목걸이」를 장착하고 「상점에서 물건 구매」 퀘스트 목표를 채웠다'],
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

  await test.step('「현자의 목걸이」를 장착하고 구매 퀘스트 목표를 채운 것을 확인한다', async () => {
    await GM골드(game, 1000);
    await 장비끼기(game, '현자의 목걸이');
    await GM퀘스트리셋(game);
    await GM퀘스트완료(game);
    const 가방 = await 가방창.열기(game);
    await verify('장신구 칸에 「현자의 목걸이」가 있다', 색글떼기(await 가방.칸글('장신구')).includes('현자의 목걸이'), true, { blocker: true });
    await 가방.닫기();
    const 퀘스트 = await 퀘스트창.열기(game);
    await verify('「상점에서 물건 구매」 진행이 「1/1」이다', await 퀘스트.진행글('상점에서 물건 구매'), '1/1', { blocker: true });
    await 퀘스트.닫기();
  });

  await test.step('그 퀘스트의 「보상 받기」를 누른다', async () => {
    const 전 = 스탯숫자(await GM스탯(game), '경험치');
    const 퀘스트 = await 퀘스트창.열기(game);
    await 퀘스트.보상받기('상점에서 물건 구매');
    await 퀘스트.받음이될때까지('상점에서 물건 구매');
    await 퀘스트.닫기();
    const 후 = 스탯숫자(await GM스탯(game), '경험치');
    await verify('그 퀘스트의 「보상 받기」를 누르면 경험치 장비를 끼고 퀘스트 보상을 받아도 경험치가 보상 그대로 50 만 는다', 후 - 전, 50);
  });
});
