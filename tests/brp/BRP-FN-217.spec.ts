import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 알림띠 } from './components/toast.component.js';
import { 골드맞추기, 알림글읽기, 알림이모두사라질때까지 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-217',
  name: '골드가 가격보다 1 적으면 「녹슨 단검」 구매에 오류 알림 「골드가 부족합니다」가 뜬다',
  platforms: ['windows'],
  precondition: ['일반 회원 골드가 「녹슨 단검」 가격보다 1 적은 79 다', '일반 회원 골드가 「녹슨 단검」 가격과 같은 80 이다'],
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

  await test.step('일반 회원 골드가 79 인 것을 확인한다', async () => {
    await verify('골드가 79 이다', await 골드맞추기(game, 79), true, { blocker: true });
  });

  await test.step('상점 「녹슨 단검」 줄의 「구매」를 누른다', async () => {
    const 상점 = await 상점창.열기(game);
    await 상점.구매하기('녹슨 단검');
    const 글 = await 알림글읽기(game, '골드가 부족합니다');
    await 상점.닫기();
    await verify('골드가 가격보다 1 적으면 「녹슨 단검」 구매에 오류 알림 「골드가 부족합니다」가 뜬다', 글 !== null, true);
  });

  await test.step('일반 회원 골드가 80 인 것을 확인한다', async () => {
    await 알림이모두사라질때까지(game);
    await verify('골드가 80 이다', await 골드맞추기(game, 80), true, { blocker: true });
  });

  await test.step('골드가 가격과 같은 채 상점 「녹슨 단검」 줄의 「구매」를 누른다', async () => {
    const 알림 = new 알림띠(game);
    const 상점 = await 상점창.열기(game);
    await 상점.구매하기('녹슨 단검');
    const 구매글 = await 알림글읽기(game, '1개 구매');
    const 부족 = await 알림.있나('골드가 부족합니다');
    await 상점.닫기();
    await verify('골드가 가격과 같을 때 「골드가 부족합니다」 없이 「1개 구매」 알림이 뜬다', 구매글 !== null && !부족, true);
  });
});
