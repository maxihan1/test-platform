import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입서버고르기까지 } from './helpers/signup-flow.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-020',
  name: '가입 경로 서버 고르기에 mastodon.maxihan.com 을 적으면 그 서버 카드가 목록 맨 위에 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    서버주소: z.string().describe('서버 고르기에 적을 서버 주소 — 점이 든 Mastodon 서버 주소').default('mastodon.maxihan.com'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 고르기 = new 서버고르기화면(driver);

  await test.step('앱을 켜서 가입용 서버 고르기 화면을 연다', async () => {
    await 가입서버고르기까지(driver);
    await verify('가입용 서버 고르기 입력 칸이 보인다', await 고르기.그려질때까지(), true, { blocker: true });
  });

  await test.step('가입 경로 서버 고르기에 mastodon.maxihan.com 을 적는다', async () => {
    const 앞 = await 고르기.첫카드제목();
    await 고르기.적기(params.서버주소);
    const 나타남 = await verify('목록 맨 위 카드가 새 서버 카드로 바뀐다', await 고르기.첫카드가바뀔때까지(앞), true);
    const 맨위 = await verify('목록 맨 위 카드 이름이 적은 서버 주소와 같다', await 고르기.첫카드제목(), params.서버주소);
    await verify('가입 경로 서버 고르기에 mastodon.maxihan.com 을 적으면 그 서버 카드가 목록 맨 위에 보인다', 나타남 && 맨위, true);
  });
});
