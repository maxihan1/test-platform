import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { API로그인, 방해막기 } from './helpers/account.helper.js';
import { 응답고쳐걸기 } from './helpers/home.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-414',
  name: '관리자 세션으로 연 홈 화면 머리글에 「관리자」 링크가 보인다',
  platforms: ['desktop'],
  precondition: ['로그인 회원 응답은 관리자로 바꾼 가짜 응답(모킹)이다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  let 풀기: (() => Promise<void>) | undefined;

  try {
    await test.step('관리자 세션 응답으로 홈 화면을 연다', async () => {
      await 방해막기(page);
      await API로그인(page.request, params.loginId ?? '', params.password ?? '');
      풀기 = await 응답고쳐걸기(page.context(), /\/api\/session$/, (본문) => ({ ...본문, user: { ...(본문.user as Record<string, unknown>), role: 'admin' } }));
      await 홈.열기();
      await 머리.로그아웃버튼.waitFor();
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
      await verify('관리자 세션으로 연 홈 화면 머리글에 「관리자」 링크가 보인다', await 머리.관리자링크.isVisible(), true);
    });
  } finally {
    await 풀기?.();
  }
});
