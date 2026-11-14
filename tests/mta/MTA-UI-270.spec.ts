import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뒤로, 문구가보이나 } from './helpers/app.helper.js';
import { 글자사라질때까지 } from './helpers/profile.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 필터링된알림화면 } from './pages/notification-requests.page.js';
import { 알림화면 } from './pages/notifications.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-270',
  name: '알림 요청 행을 누르면 그 사람의 알림 목록이 열리고 메뉴에 「알림 허용」 · 「알림 요청 해제」가 있다',
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
  const 요청 = new 필터링된알림화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('필터링된 알림 행을 누른다', async () => {
    try {
      await 알림.열기();
      await 요청.열기();
      await 요청.첫행누르기();
      const 판정1 = await verify('알림 요청 화면이 닫히고 그 사람의 알림 목록이 열린다', await 글자사라질때까지(driver, '필터링된 알림'), true);
      await 요청.메뉴펼치기();
      const 판정2 = await verify('메뉴에 「알림 허용」이 보인다', await 문구가보이나(driver, '알림 허용'), true);
      const 판정3 = await verify('메뉴에 「알림 요청 해제」가 보인다', await 문구가보이나(driver, '알림 요청 해제'), true);
      await verify('알림 요청 행을 누르면 그 사람의 알림 목록이 열리고 메뉴에 「알림 허용」 · 「알림 요청 해제」가 있다', 판정1 && 판정2 && 판정3, true);
    } finally {
      await 뒤로(driver);
    }
  }, { capture: true });
});
