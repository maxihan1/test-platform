import { defineCase, test, verify } from '@platform/kit';
import { 앱다시켜기 } from '@platform/kit/parts';
import { z } from 'zod';

import { 꾸러미 } from './helpers/app.helper.js';
import { 시작화면열기 } from './helpers/login.helper.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-013',
  name: '클립보드에 mastodon.maxihan.com 초대 링크를 넣고 앱을 켜면 기본 서버 버튼이 「mastodon.maxihan.com 참여를 위해 초대하기」로 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    초대링크: z.string().describe('클립보드에 넣을 초대 링크 — mastodon.maxihan.com 의 /invite/ 주소').default('https://mastodon.maxihan.com/invite/qa-invite'),
  }),
  expected: z.object({
    버튼글: z.string().describe('기본 서버 버튼 글자').default('mastodon.maxihan.com 참여를 위해 초대하기'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 시작 = new 시작화면(driver);

  await test.step('앱을 켜서 시작 화면을 연다', async () => {
    await 시작화면열기(driver);
    await verify('시작 화면 「로그인」 버튼이 보인다', await 시작.그려질때까지(), true, { blocker: true });
  });

  await test.step('클립보드에 초대 링크를 넣고 앱을 켠다', async () => {
    await driver.execute('mobile: setClipboard', { content: Buffer.from(params.초대링크).toString('base64'), contentType: 'plaintext' });
    await 앱다시켜기(driver, 꾸러미);
    await verify('시작 화면 「로그인」 버튼이 보인다', await 시작.그려질때까지(), true, { blocker: true });
    await verify(
      '클립보드에 mastodon.maxihan.com 초대 링크를 넣고 앱을 켜면 기본 서버 버튼이 「mastodon.maxihan.com 참여를 위해 초대하기」로 보인다',
      await 시작.글('기본서버가입'),
      expected.버튼글,
    );
  });
});
