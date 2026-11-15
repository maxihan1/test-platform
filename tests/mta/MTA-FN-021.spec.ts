import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 가입서버고르기까지 } from './helpers/signup-flow.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-021',
  name: '가입 경로 서버 고르기에 점 없는 「maxihan」을 적으면 목록 맨 위에 그 서버 카드가 생기지 않는다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    서버이름: z.string().describe('서버 고르기에 적을 점 없는 글자').default('maxihan'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 고르기 = new 서버고르기화면(driver);

  await test.step('앱을 켜서 가입용 서버 고르기 화면을 연다', async () => {
    await 가입서버고르기까지(driver);
    await verify('가입용 서버 고르기 입력 칸이 보인다', await 고르기.그려질때까지(), true, { blocker: true });
  });

  await test.step('가입 경로 서버 고르기에 점 없는 「maxihan」을 적는다', async () => {
    await 고르기.적기(params.서버이름);
    await verify('가입 경로 서버 고르기에 점 없는 「maxihan」을 적으면 목록 맨 위에 그 서버 카드가 생기지 않는다', await 뜰때까지(driver, 고르기.카드(params.서버이름), 8_000), false);
  });
});
