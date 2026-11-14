import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-103',
  name: '홈 머리말 설정 버튼을 누르면 「부스트 표시」 · 「답글 표시」 · 「인용 보기」 체크가 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('로그인 후 오른쪽 메뉴에 「홈」이 보인다', await 홈.메뉴.링크(/^홈/).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 홈.열기();
    await verify('홈 머리말에 설정 버튼이 보인다', await 홈.설정버튼.isVisible(), true, { blocker: true });
  });

  await test.step('홈 머리말 설정 버튼을 누른다', async () => {
    await 홈.설정버튼.click();
    const 부스트 = await verify('「부스트 표시」 체크가 보인다', await 홈.설정항목('부스트 표시').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    const 답글 = await verify('「답글 표시」 체크가 보인다', await 홈.설정항목('답글 표시').isVisible(), true);
    const 인용 = await verify('「인용 보기」 체크가 보인다', await 홈.설정항목('인용 보기').isVisible(), true);
    await verify('홈 머리말 설정 버튼을 누르면 「부스트 표시」 · 「답글 표시」 · 「인용 보기」 체크가 보인다', 부스트 && 답글 && 인용, true);
  });
});
