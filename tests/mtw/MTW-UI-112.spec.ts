import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-112',
  name: '작성 상자 본문 칸에 「지금 무슨 생각을 하고 있나요?」가 보이고 「내용 경고 (선택사항)」 칸은 없다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    const 본문 = await verify('작성 상자 본문 칸에 「지금 무슨 생각을 하고 있나요?」가 보인다', await 홈.작성.본문.isVisible(), true);
    const 경고 = await verify('「내용 경고 (선택사항)」 칸은 없다', await 홈.작성.경고칸.isVisible(), false);
    await verify('작성 상자 본문 칸에 「지금 무슨 생각을 하고 있나요?」가 보이고 「내용 경고 (선택사항)」 칸은 없다', 본문 && 경고, true);
  });

  await test.step('작성 상자에서 「열람 주의 문구 추가」를 누른다', async () => {
    await 홈.작성.경고.click();
    const 나타났다 = await 홈.작성.경고칸.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('「내용 경고 (선택사항)」 칸이 나타난다', 나타났다, true);
  });
});
