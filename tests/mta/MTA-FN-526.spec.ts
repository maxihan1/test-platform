import { defineCase, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 앱링크열기 } from './helpers/signup-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글쓰기화면 } from './pages/compose.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-526',
  name: '「mastodon://share?text=」 주소로 들어오면 글쓰기 본문에 그 글만 채워진다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    공유할글: z.string().describe('공유 주소 text 뒤에 붙일 글').default('안녕'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('「mastodon://share?text=안녕」 주소를 연다', async () => {
    await 앱링크열기(driver, `mastodon://share?text=${encodeURIComponent(params.공유할글)}`);
    await verify('글쓰기 본문 칸이 보인다', await 글쓰기.그려질때까지(), true, { blocker: true });
    await 될때까지(driver, async () => (await driver.$(글쓰기.본문).getText()).includes(params.공유할글), 10_000);
    await verify('「mastodon://share?text=」 주소로 들어오면 글쓰기 본문에 그 글만 채워진다', await driver.$(글쓰기.본문).getText(), params.공유할글);
  });
});
