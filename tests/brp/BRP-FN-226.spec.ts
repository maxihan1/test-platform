import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 골드맞추기, 알림글읽기 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-226',
  name: '상점 「녹슨 단검」 줄의 「구매」 버튼 상태를 읽고 누르면 골드가 모자라도 「구매」 버튼은 눌리는 상태다',
  platforms: ['windows'],
  precondition: ['일반 회원 골드가 0 이다'],
  techniques: ['동등 분할'],
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

  await test.step('일반 회원 골드가 0 인 것을 확인한다', async () => {
    await verify('골드가 0 이다', await 골드맞추기(game, 0), true, { blocker: true });
  });

  await test.step('상점 「녹슨 단검」 줄의 「구매」 버튼 상태를 읽고 누른다', async () => {
    const 상점 = await 상점창.열기(game);
    const 눌림 = await 상점.구매버튼눌림('녹슨 단검');
    await 상점.구매하기('녹슨 단검');
    const 글 = await 알림글읽기(game, '골드가 부족합니다');
    await 상점.닫기();
    await verify('상점 「녹슨 단검」 줄의 「구매」 버튼 상태를 읽고 누르면 골드가 모자라도 「구매」 버튼은 눌리는 상태다', 눌림, true);
    await verify('골드가 모자란 채 「구매」를 누른 뒤 서버가 오류 알림으로 거절한다', 글 !== null, true);
  });
});
