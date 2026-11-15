import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 알림글 } from './components/toast.component.js';
import { 서버고르고다음, 시작화면열기 } from './helpers/login.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-587',
  name: '브라우저 앱이 없는 폰에서 로그인을 진행하면 토스트 「이 동작을 처리할 앱이 없습니다」가 보인다',
  platforms: ['android'],
  held: '보류 — 브라우저 앱을 지운 폰이 없다',
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: z.object({
    토스트글: z.string().describe('토스트 글').default('이 동작을 처리할 앱이 없습니다'),
  }),
});

test(spec, async ({ driver, expected }) => {
  const 시작 = new 시작화면(driver);
  const 고르기 = new 서버고르기화면(driver);
  const 알림 = new 알림글(driver);

  await test.step('앱을 켜서 시작 화면을 연다', async () => {
    await 시작화면열기(driver);
    await verify('시작 화면 「로그인」 버튼이 보인다', await 시작.그려질때까지(), true, { blocker: true });
  });

  await test.step('브라우저 앱이 없는 폰에서 로그인을 진행한다', async () => {
    await 시작.누르기('로그인');
    await verify('로그인용 서버 고르기 입력 칸이 보인다', await 고르기.그려질때까지(), true, { blocker: true });
    await 서버고르고다음(driver);
    await verify('브라우저 앱이 없는 폰에서 로그인을 진행하면 토스트 「이 동작을 처리할 앱이 없습니다」가 보인다', await 알림.토스트(10_000), expected.토스트글);
  });
});
