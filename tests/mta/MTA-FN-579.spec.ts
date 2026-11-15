import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입서버고르기까지 } from './helpers/signup-flow.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-579',
  name: '가입 경로에 없는 서버 「zzqq-none.invalid」를 적으면 「“zzqq-none.invalid” 서버를 찾을 수 없습니다」가 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    서버주소: z.string().describe('서버 고르기에 적을 없는 서버 주소 — .invalid 로 끝나는 주소').default('zzqq-none.invalid'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 고르기 = new 서버고르기화면(driver);

  await test.step('앱을 켜서 가입용 서버 고르기 화면을 연다', async () => {
    await 가입서버고르기까지(driver);
    await verify('가입용 서버 고르기 입력 칸이 보인다', await 고르기.그려질때까지(), true, { blocker: true });
  });

  await test.step('가입 경로에 없는 서버 zzqq-none.invalid 를 적는다', async () => {
    await 고르기.적기(params.서버주소);
    await verify('가입 경로에 없는 서버 「zzqq-none.invalid」를 적으면 「“zzqq-none.invalid” 서버를 찾을 수 없습니다」가 보인다', await 고르기.글보이나(`“${params.서버주소}” 서버를 찾을 수 없습니다`, 20_000), true);
  });
});
