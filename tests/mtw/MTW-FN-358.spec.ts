import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { PNG만들기 } from './helpers/media.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 작성화면 } from './pages/publish.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-358',
  name: '대체 텍스트 없이 이미지 글을 게시하면 「대체 텍스트를 추가할까요?」가 뜬다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 글쓰기 = new 작성화면(page);

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  await test.step('대체 텍스트 없이 이미지 글을 게시한다', async () => {
    await 글쓰기.이미지넣기(await PNG만들기(page, '대체없음.png', 64, 64, true), 1);
    await 글쓰기.게시버튼.click();
    const 떴다 = await 글쓰기.대체텍스트확인.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('대체 텍스트 없이 이미지 글을 게시하면 「대체 텍스트를 추가할까요?」가 뜬다', 떴다, true);
  });
});
