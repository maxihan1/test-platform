import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인상자 } from './components/login.component.js';
import { 로그인한홈화면 } from './pages/member-home.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-005',
  name: '로그인한 홈 화면에 「Journey Start!」가 보인다',
  platforms: ['desktop'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('테스트 계정 이메일').optional().meta({ secret: true }),
    password: z.string().describe('테스트 계정 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인상자(page);
  const 홈 = new 로그인한홈화면(page);

  await test.step('로그인 화면에서 테스트 계정으로 로그인한다', async () => {
    await 로그인.로그인한다(params.loginId ?? '', params.password ?? '');
  });

  await test.step('로그인됐는지 확인한다', async () => {
    await 로그인.로그인뒤표시.waitFor();
    await verify('로그인 뒤 홈 화면에 「Journey Start!」가 보인다', await 로그인.로그인뒤표시.isVisible(), true, { blocker: true });
  });

  await test.step('홈 화면을 연다', async () => {
    await 홈.연다();
    await 홈.FAQ더보기링크.waitFor();
    await verify('로그인한 홈 화면에 「Journey Start!」가 보인다', await 홈.첫단계카드.isVisible(), true);
    const 보임 = await Promise.all([홈.공지사항제목, 홈.FAQ제목].map((제목) => 제목.isVisible()));
    await verify('「공지사항」 · 「FAQ」 제목이 보인다', 보임.every(Boolean), true);
    await verify('머리글에 「로그인」 링크가 보이지 않는다', await 홈.머리글.로그인링크.isVisible(), false);
  });
});
