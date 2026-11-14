import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 알림화면 } from './pages/notifications.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-253',
  name: '팔로우 요청 알림은 「<이름> 님이 나에게 팔로우 요청을 보냄」과 「확정」 · 「삭제」가 보이고 누르면 프로필이 열린다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 알림 = new 알림화면(driver);
  const 프로필 = new 프로필화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('알림 목록에서 팔로우 요청 알림을 본다', async () => {
    await 알림.열기();
    const 판정1 = await verify('팔로우 요청 알림 「<이름> 님이 나에게 팔로우 요청을 보냄」이 보인다', await 문구가보이나(driver, '<이름> 님이 나에게 팔로우 요청을 보냄'), true);
    const 판정2 = await verify('팔로우 요청 알림에 「확정」 버튼이 보인다', await 알림.보이나(알림.확정), true);
    const 판정3 = await verify('팔로우 요청 알림에 「삭제」 버튼이 보인다', await 알림.보이나(알림.삭제), true);
    await 알림.글누르기('님이 나에게 팔로우 요청을 보냄');
    const 판정4 = await verify('팔로우 요청 알림을 누르면 프로필이 열린다', await 프로필.떴나(), true);
    await verify('팔로우 요청 알림은 「<이름> 님이 나에게 팔로우 요청을 보냄」과 「확정」 · 「삭제」가 보이고 누르면 프로필이 열린다', 판정1 && 판정2 && 판정3 && 판정4, true);
  }, { capture: true });
});
