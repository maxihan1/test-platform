import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-367',
  name: '내용 경고에 10자를 넣으면 남은 글자 수가 「490」으로 줄어든다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
    경고글자수: z.number().int().min(1).max(100).describe('내용 경고에 넣는 글자 수 — 1 이상 100 이하').default(10),
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

  await test.step('내용 경고를 켜고 경고 칸에 10자를 넣는다', async () => {
    await 홈.작성.경고.click();
    await 홈.작성.경고칸.fill('가'.repeat(params.경고글자수));
    const 줄었다 = await 홈.작성.남은글자(500 - params.경고글자수).waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('내용 경고에 10자를 넣으면 남은 글자 수가 「490」으로 줄어든다', 줄었다, true);
  });

  await test.step('본문에 https 주소 하나만 넣는다', async () => {
    await 홈.열기();
    await 홈.작성.쓰기(`https://example.com/${'a'.repeat(80)}`);
    const 남았다 = await 홈.작성.남은글자(477).waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('주소 하나는 길이와 상관없이 23자로 세어 「477」이 남는다', 남았다, true);
  });
});
