import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 알림설정화면 } from './pages/notif-settings.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-504',
  name: '기기 알림이 꺼져 있으면 알림 설정 위에 「어디에서든 업데이트를 확인할 수 있도록 기기 설정에서 알림 켜기」 + 「알림 설정으로 이동」 배너가 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 시작 = new 시작화면(driver);
  const 홈 = new 홈화면(driver);
  const 알림설정 = new 알림설정화면(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('로그인할 때 알림 권한을 거부하고 알림 설정을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword, '거부');
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
    await 홈.설정누르기();
    await 알림설정.설정에서열기();
    await verify('알림 설정 화면이 보인다', await 알림설정.떴나(), true, { blocker: true });
    const 안내 = await verify('「어디에서든 업데이트를 확인할 수 있도록 기기 설정에서 알림 켜기」가 보인다', await 알림설정.글이보이나('어디에서든 업데이트를 확인할 수 있도록 기기 설정에서 알림 켜기'), true);
    const 이동 = await verify('「알림 설정으로 이동」이 보인다', await 알림설정.글이보이나('알림 설정으로 이동'), true);
    await verify('기기 알림이 꺼져 있으면 알림 설정 위에 「어디에서든 업데이트를 확인할 수 있도록 기기 설정에서 알림 켜기」 + 「알림 설정으로 이동」 배너가 보인다', 안내 && 이동, true);
  }, { capture: true });
});
