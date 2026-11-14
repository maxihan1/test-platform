import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 알림화면 } from './pages/notifications.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-613',
  name: '팔로우 요청 알림에서 「확정」과 「삭제」를 누르면 팔로우 요청 알림에서 「확정」은 수락, 「삭제」는 거절한다',
  platforms: ['android'],
  held: '보류 — 바꿔도 되는 팔로우 요청',
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

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('팔로우 요청 알림에서 「확정」과 「삭제」를 누른다', async () => {
    await 알림.열기();
    await 알림.확정누르기();
    const 판정1 = await verify('「확정」을 누른 요청 알림의 버튼이 사라진다', await 알림.확정사라졌나(), true);
    await 알림.삭제누르기();
    const 판정2 = await verify('「삭제」를 누른 요청 알림의 버튼이 사라진다', await 알림.삭제사라졌나(), true);
    await verify('팔로우 요청 알림에서 「확정」과 「삭제」를 누르면 팔로우 요청 알림에서 「확정」은 수락, 「삭제」는 거절한다', 판정1 && 판정2, true);
  }, { capture: true });
});
