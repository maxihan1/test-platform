import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 계정설정화면 } from './pages/set-account.page.js';
import { 계정알림설정화면 } from './pages/set-notif.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-428',
  name: '「모두 일시 중지」 부제는 꺼져 있으면 「끄기」, 켜져 있으면 「<시각>에 종료」다',
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
  await test.step('홈에서 설정을 연다', async () => {
    await verify('설정 화면에 「계정 추가...」 줄이 보인다', await 설정.열기(), true, { blocker: true });
  });
  await test.step('설정에서 계정 설정을 연다', async () => {
    await 설정.계정줄누르기();
    await verify('계정 설정 화면에 계정 이름 제목이 보인다', await 계정설정.떴나(), true, { blocker: true });
  });
  try {
    await test.step('계정 설정에서 「알림」을 누른다', async () => {
      await 계정설정.줄누르기('알림');
      await verify('알림 설정 화면이 열린다', await 알림.떴나(), true);
      const 꺼짐 = await verify('「모두 일시 중지」 부제가 「끄기」다', await 알림.부제글('모두 일시 중지'), '끄기');
      await 알림.줄누르기('모두 일시 중지');
      await 알림.선택지고르기('30분');
      중단 = true;
      const 켜짐 = await verify('켜진 뒤 「모두 일시 중지」 부제가 「<시각>에 종료」다', await 알림.종료부제보이나(), true);
      await verify('「모두 일시 중지」 부제는 꺼져 있으면 「끄기」, 켜져 있으면 「<시각>에 종료」다', 꺼짐 && 켜짐, true);
    }, { capture: true });
  } finally {
    if (중단) await 알림.지금재개누르기();
  }
});
