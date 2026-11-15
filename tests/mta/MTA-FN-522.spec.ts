import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 앱링크열기 } from './helpers/signup-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글쓰기화면 } from './pages/compose.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-522',
  name: '계정이 하나일 때 공유받기로 들어오면 곧바로 「새 게시물」 글쓰기가 열린다',
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

  await test.step('계정 하나인 앱에 「mastodon://share?text=」 주소로 들어온다', async () => {
    await 앱링크열기(driver, `mastodon://share?text=${encodeURIComponent(params.공유할글)}`);
    await verify('글쓰기 본문 칸이 보인다', await 글쓰기.그려질때까지(), true, { blocker: true });
    await verify('계정이 하나일 때 공유받기로 들어오면 곧바로 「새 게시물」 글쓰기가 열린다', await driver.$(글쓰기.제목글).getText(), '새 게시물');
  });
});
