import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 계정설정화면 } from './pages/set-account.page.js';
import { 계정알림설정화면 } from './pages/set-notif.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-505',
  name: '알림 일시 중지 중이면 배너에 「<시각>에 알림이 다시 시작됩니다.」 + 「지금 재개」가 보인다',
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
  let 중단 = false;

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
    await test.step('알림 설정에서 「모두 일시 중지」를 30분으로 켠다', async () => {
      await 알림.줄누르기('모두 일시 중지');
      await 알림.선택지고르기('30분');
      중단 = true;
      const 시작 = await verify('배너에 「<시각>에 알림이 다시 시작됩니다.」가 보인다', await 알림.글보이나('<시각>에 알림이 다시 시작됩니다.'), true);
      const 재개 = await verify('배너에 「지금 재개」가 보인다', await 알림.지금재개보이나(), true);
      await verify('알림 일시 중지 중이면 배너에 「<시각>에 알림이 다시 시작됩니다.」 + 「지금 재개」가 보인다', 시작 && 재개, true);
    }, { capture: true });
  } finally {
    if (중단) await 알림.지금재개누르기();
  }
});
