import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 작성화면 } from './pages/publish.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-110',
  name: '작성 상자 공개 범위 버튼에 「공개, 인용 허용」이 보인다',
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

  await test.step('홈을 연다', async () => {
    await verify('작성 상자 공개 범위 버튼에 「공개, 인용 허용」이 보인다', await 글쓰기.공개범위버튼('공개, 인용 허용').isVisible(), true);
  });

  await test.step('공개 범위 버튼을 누른다', async () => {
    await 홈.작성.공개범위.click();
    const 떴다 = await 글쓰기.창.제목('공개범위와 반응').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('공개 범위 버튼을 누르면 「공개범위와 반응」 창이 뜬다', 떴다, true);
  });
});
