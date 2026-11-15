import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 사라질때까지 } from '@platform/kit/parts';

import { 앱링크열기 } from './helpers/signup-flow.helper.js';
import { 시작화면열기 } from './helpers/login.helper.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-098',
  name: 'code 없는 「org.joinmastodon.android-auth://callback」 주소를 열면 앱 화면이 바뀌지 않는다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    주소: z.string().describe('여는 인증 되돌아오기 주소 — code 가 없는 주소').default('org.joinmastodon.android-auth://callback'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 시작 = new 시작화면(driver);

  await test.step('앱을 켜서 시작 화면을 연다', async () => {
    await 시작화면열기(driver);
    await verify('시작 화면 「로그인」 버튼이 보인다', await 시작.그려질때까지(), true, { blocker: true });
  });

  await test.step('code 없는 인증 되돌아오기 주소를 연다', async () => {
    await 앱링크열기(driver, params.주소);
    await verify('code 없는 「org.joinmastodon.android-auth://callback」 주소를 열면 앱 화면이 바뀌지 않는다', await 사라질때까지(driver, 시작.로그인, 5_000), false);
  });
});
