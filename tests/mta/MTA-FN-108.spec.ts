import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입해서이메일확인화면으로 } from './helpers/confirm.helper.js';
import { 시작화면열기 } from './helpers/login.helper.js';
import { 알림글 } from './components/toast.component.js';
import { 이메일확인화면 } from './pages/email-confirm.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-108',
  name: '이메일 확인 화면에서 「재전송」을 누르면 토스트 「확인용 이메일이 보내졌습니다」가 보인다',
  platforms: ['android'],
  precondition: ['이메일 확인 대기 계정이 있다'],
  params: null,
  expected: z.object({
    토스트글: z.string().describe('재전송 성공 토스트 글').default('확인용 이메일이 보내졌습니다'),
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
    await verify('「재전송」 버튼이 켜져 있다', await 확인.재전송켜질때까지(70_000), true, { blocker: true });
  });

  await test.step('이메일 확인 화면에서 「재전송」을 누른다', async () => {
    await 확인.재전송누르기();
    await verify('이메일 확인 화면에서 「재전송」을 누르면 토스트 「확인용 이메일이 보내졌습니다」가 보인다', await 알림.토스트(), expected.토스트글);
  });
});
