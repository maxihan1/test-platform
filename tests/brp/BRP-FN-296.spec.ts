import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 골드맞추기, 알림글읽기, 알림이모두사라질때까지, 퀘스트처음으로 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-296',
  name: '골드가 「조약돌」 가격보다 1 적어 구매가 거절되면 「상점에서 물건 구매」 진행이 0 그대로다',
  platforms: ['windows'],
  precondition: ['일반 회원 골드가 「조약돌」 가격보다 1 적은 2 이고 오늘 퀘스트를 처음으로 돌렸다', '일반 회원 골드가 「조약돌」 가격과 같은 3 이고 오늘 퀘스트를 처음으로 돌렸다'],
  techniques: ['경계값 분석'],
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

  await test.step('일반 회원 골드가 2 이고 오늘 퀘스트를 처음으로 돌린 것을 확인한다', async () => {
    await 퀘스트처음으로(game);
    await verify('골드가 2 이다', await 골드맞추기(game, 2), true, { blocker: true });
  });

  await test.step('상점에서 「조약돌」 「구매」를 누른다', async () => {
    const 상점 = await 상점창.열기(game);
    await 상점.구매하기('조약돌');
    await 알림글읽기(game, '골드가 부족합니다');
    await 상점.닫기();
    const 퀘스트 = await 퀘스트창.열기(game);
    const 글 = await 퀘스트.진행글('상점에서 물건 구매');
    await 퀘스트.닫기();
    await verify('골드가 「조약돌」 가격보다 1 적어 구매가 거절되면 「상점에서 물건 구매」 진행이 0 그대로다', 글, '0/1');
  });

  await test.step('일반 회원 골드가 3 인 것을 확인한다', async () => {
    await 알림이모두사라질때까지(game);
    await verify('골드가 3 이다', await 골드맞추기(game, 3), true, { blocker: true });
  });

  await test.step('골드가 가격과 같은 채 상점에서 「조약돌」 「구매」를 누른다', async () => {
    const 상점 = await 상점창.열기(game);
    await 상점.구매하기('조약돌');
    await 상점.닫기();
    const 퀘스트 = await 퀘스트창.열기(game);
    await 퀘스트.진행이될때까지('상점에서 물건 구매', '1/1');
    const 글 = await 퀘스트.진행글('상점에서 물건 구매');
    await 퀘스트.닫기();
    await verify('골드가 「조약돌」 가격과 같아 구매에 성공한 뒤 「상점에서 물건 구매」 진행이 「1/1」이 된다', 글, '1/1');
  });
});
