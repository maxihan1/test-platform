import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입해서이메일확인화면으로 } from './helpers/confirm.helper.js';
import { 시작화면열기 } from './helpers/login.helper.js';
import { 알림글 } from './components/toast.component.js';
import { 이메일확인화면 } from './pages/email-confirm.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-588',
  name: '이메일 앱이 없는 폰에서 「이메일 앱 열기」를 누르면 토스트 「이 동작을 처리할 앱이 없습니다」가 보인다',
  platforms: ['android'],
  held: '보류 — 이메일 앱을 지운 폰이 없다',
  precondition: ['이메일 확인 대기 계정이 있다'],
  params: null,
  expected: z.object({
    토스트글: z.string().describe('앱이 없을 때 토스트 글').default('이 동작을 처리할 앱이 없습니다'),
  }),
});

test(spec, async ({ driver, expected }) => {
  const 시작 = new 시작화면(driver);
  const 확인 = new 이메일확인화면(driver);
  const 알림 = new 알림글(driver);

  await test.step('앱을 켜서 시작 화면을 연다', async () => {
    await 시작화면열기(driver);
    await verify('시작 화면 「로그인」 버튼이 보인다', await 시작.그려질때까지(), true, { blocker: true });
  });

  await test.step('이메일 확인 대기 계정으로 로그인해 확인 화면을 연다', async () => {
    await 가입해서이메일확인화면으로(driver);
    await verify('「수신함 확인하기」 화면이 보인다', await 확인.그려질때까지(), true, { blocker: true });
    await verify('「이메일 앱 열기」 버튼이 보인다', await 확인.글보이나('이메일 앱 열기'), true, { blocker: true });
  });

  await test.step('이메일 앱이 없는 폰에서 「이메일 앱 열기」를 누른다', async () => {
    await 확인.이메일앱열기누르기();
    await verify('이메일 앱이 없는 폰에서 「이메일 앱 열기」를 누르면 토스트 「이 동작을 처리할 앱이 없습니다」가 보인다', await 알림.토스트(), expected.토스트글);
  });
});
