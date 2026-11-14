import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 필터링된알림화면 } from './pages/notification-requests.page.js';
import { 알림화면 } from './pages/notifications.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-614',
  name: '알림 요청을 허용하면 스낵바 「<이름> 가 이제 알림 목록에 나타날 것입니다.」, 해제하면 「<이름> 로부터의 알림이 해제되었습니다.」가 보인다',
  platforms: ['android'],
  held: '보류 — 바꿔도 되는 알림 요청',
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
  const 요청 = new 필터링된알림화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('필터링된 알림에서 허용과 해제를 누른다', async () => {
    await 알림.열기();
    await 요청.열기();
    await 요청.허용누르기();
    const 판정1 = await verify('허용한 뒤 스낵바 「<이름> 가 이제 알림 목록에 나타날 것입니다.」가 보인다', await 문구가보이나(driver, '<이름> 가 이제 알림 목록에 나타날 것입니다.'), true);
    await 요청.해제누르기();
    const 판정2 = await verify('해제한 뒤 스낵바 「<이름> 로부터의 알림이 해제되었습니다.」가 보인다', await 문구가보이나(driver, '<이름> 로부터의 알림이 해제되었습니다.'), true);
    await verify('알림 요청을 허용하면 스낵바 「<이름> 가 이제 알림 목록에 나타날 것입니다.」, 해제하면 「<이름> 로부터의 알림이 해제되었습니다.」가 보인다', 판정1 && 판정2, true);
  }, { capture: true });
});
