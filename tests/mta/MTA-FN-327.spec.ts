import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 알림글 } from './components/toast.component.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';

import { 알림화면 } from './pages/notifications.page.js';
import { 알림요청화면 } from './pages/notification-requests.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-327',
  name: '알림 요청 줄에서 허용을 누르면 스낵바 「가 이제 알림 목록에 나타날 것입니다.」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    계정: z.string().min(1).describe('허용할 걸러진 알림 계정의 사용자명 — 바꿔도 되는 시드').default('filt_hong'),
  }),
  expected: z.object({
    안내: z.string().describe('스낵바 글에 든 안내').default('가 이제 알림 목록에 나타날 것입니다.'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 알림 = new 알림화면(driver);
  const 요청 = new 알림요청화면(driver);
  const 토스트 = new 알림글(driver);

  await test.step('일반 회원으로 로그인해 알림 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('알림 화면이 열린다', await 알림.열기(), true, { blocker: true });
  });

  await test.step('filt_hong 요청 줄에서 허용을 누른다', async () => {
    await verify('「필터링된 알림」 줄이 보인다', await 뜰때까지(driver, 알림.필터링줄, 15_000), true, { blocker: true });
    await 알림.필터링줄열기();
    await verify('「필터링된 알림」 화면 줄이 보인다', await 요청.그려질때까지(), true, { blocker: true });
    const 번호 = await 요청.줄번호(params.계정);
    await verify('허용할 요청 줄이 보인다', 번호 >= 0, true, { blocker: true });
    await driver.$(요청.허용줄(번호)).click();
    await verify('알림 요청 줄에서 허용을 누르면 스낵바 「가 이제 알림 목록에 나타날 것입니다.」가 보인다', (await 토스트.스낵바글()).includes(expected.안내), true);
  });
});
