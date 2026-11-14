import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 계정설정화면 } from './pages/set-account.page.js';
import { 계정알림설정화면 } from './pages/set-notif.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-427',
  name: '「모두 일시 중지」를 켜면 「모든 알림 일시 중단」 창에서 30분 · 1시간 · 12시간 · 1일 · 3일 · 1 주 가운데 고른다',
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
  const 설정 = new 설정화면(driver);
  const 계정설정 = new 계정설정화면(driver);
  const 알림 = new 계정알림설정화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('설정에서 알림 설정을 연다', async () => {
    await 설정.열기();
    await 설정.계정줄누르기();
    await 계정설정.줄누르기('알림');
    await verify('알림 설정 화면에 「알림 받기」 줄이 보인다', await 알림.떴나(), true, { blocker: true });
  });
  try {
    await test.step('알림 설정에서 「모두 일시 중지」를 켠다', async () => {
      await 알림.줄누르기('모두 일시 중지');
      const 창 = await verify('「모든 알림 일시 중단」 창이 뜬다', await 알림.창보이나('모든 알림 일시 중단'), true);
      const 삼십분 = await verify('선택지 「30분」이 보인다', await 알림.선택지보이나('30분'), true);
      const 한시간 = await verify('선택지 「1시간」이 보인다', await 알림.선택지보이나('1시간'), true);
      const 열두시간 = await verify('선택지 「12시간」이 보인다', await 알림.선택지보이나('12시간'), true);
      const 하루 = await verify('선택지 「1일」이 보인다', await 알림.선택지보이나('1일'), true);
      const 사흘 = await verify('선택지 「3일」이 보인다', await 알림.선택지보이나('3일'), true);
      const 주 = await verify('선택지 「1 주」가 보인다', await 알림.선택지보이나('1 주'), true);
      await verify('「모두 일시 중지」를 켜면 「모든 알림 일시 중단」 창에서 30분 · 1시간 · 12시간 · 1일 · 3일 · 1 주 가운데 고른다', 창 && 삼십분 && 한시간 && 열두시간 && 하루 && 사흘 && 주, true);
    }, { capture: true });
  } finally {
    await 알림.창닫기();
    if (await 알림.켜졌나('모두 일시 중지')) await 알림.줄누르기('모두 일시 중지');
  }
});
