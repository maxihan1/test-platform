import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입서버고르기까지 } from './helpers/signup-flow.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-034',
  name: '가입 경로에 「https://mastodon.maxihan.com/about」을 붙여 넣으면 서버 카드 이름이 「mastodon.maxihan.com」으로 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    붙여넣을주소: z.string().describe('서버 고르기에 붙여 넣을 주소 — https:// 로 시작하는 서버 주소').default('https://mastodon.maxihan.com/about'),
  }),
  expected: z.object({
    카드이름: z.string().describe('서버 카드 이름').default('mastodon.maxihan.com'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 고르기 = new 서버고르기화면(driver);

  await test.step('앱을 켜서 가입용 서버 고르기 화면을 연다', async () => {
    await 가입서버고르기까지(driver);
    await verify('가입용 서버 고르기 입력 칸이 보인다', await 고르기.그려질때까지(), true, { blocker: true });
  });

  await test.step('가입 경로에 https://mastodon.maxihan.com/about 을 붙여 넣는다', async () => {
    const 앞 = await 고르기.첫카드제목();
    await 고르기.적기(params.붙여넣을주소);
    const 나타남 = await verify('목록 맨 위 카드가 새 서버 카드로 바뀐다', await 고르기.첫카드가바뀔때까지(앞), true);
    const 이름 = await verify('목록 맨 위 카드 이름이 기대 이름과 같다', await 고르기.첫카드제목(), expected.카드이름);
    await verify('가입 경로에 「https://mastodon.maxihan.com/about」을 붙여 넣으면 서버 카드 이름이 「mastodon.maxihan.com」으로 보인다', 나타남 && 이름, true);
  });
});
