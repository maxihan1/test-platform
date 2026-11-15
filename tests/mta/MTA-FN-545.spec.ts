import { defineCase, test, verify } from '@platform/kit';
import { 사라질때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 앱링크열기 } from './helpers/signup-flow.helper.js';
import { 시작화면열기 } from './helpers/login.helper.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-545',
  name: '로그인 계정이 없을 때 링크로 들어오면 시작 화면 그대로 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    주소: z.string().describe('앱에 넘길 우리 서버 글 주소 — 서버에 있는 글의 주소').default('https://mastodon.maxihan.com/@hana_photo/1'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 시작 = new 시작화면(driver);

  await test.step('앱을 켜서 시작 화면을 연다', async () => {
    await 시작화면열기(driver);
    await verify('시작 화면 「로그인」 버튼이 보인다', await 시작.그려질때까지(), true, { blocker: true });
  });

  await test.step('계정이 없는 앱에 우리 서버 글 주소를 넘긴다', async () => {
    await 앱링크열기(driver, params.주소);
    await verify('로그인 계정이 없을 때 링크로 들어오면 시작 화면 그대로 보인다', await 사라질때까지(driver, 시작.로그인, 5_000), false);
  });
});
