import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 알림글 } from './components/toast.component.js';
import { 앱링크열기 } from './helpers/signup-flow.helper.js';
import { 시작화면열기 } from './helpers/login.helper.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-521',
  name: '로그인 계정이 없을 때 공유받기로 들어오면 토스트 「먼저 마스토돈에 로그인해야 합니다」가 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    공유할글: z.string().describe('공유 주소 text 뒤에 붙일 글').default('안녕'),
  }),
  expected: z.object({
    토스트글: z.string().describe('토스트 글').default('먼저 마스토돈에 로그인해야 합니다'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 시작 = new 시작화면(driver);
  const 알림 = new 알림글(driver);

  await test.step('앱을 켜서 시작 화면을 연다', async () => {
    await 시작화면열기(driver);
    await verify('시작 화면 「로그인」 버튼이 보인다', await 시작.그려질때까지(), true, { blocker: true });
  });

  await test.step('계정이 없는 앱에 「mastodon://share?text=」 주소로 들어온다', async () => {
    await 앱링크열기(driver, `mastodon://share?text=${encodeURIComponent(params.공유할글)}`);
    await verify('로그인 계정이 없을 때 공유받기로 들어오면 토스트 「먼저 마스토돈에 로그인해야 합니다」가 보인다', await 알림.토스트(10_000), expected.토스트글);
  });
});
