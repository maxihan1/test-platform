import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 로그인상자 } from './components/login.component.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-007',
  name: '맞는 이메일과 비밀번호로 로그인하면 홈 화면에 「Journey Start!」가 보인다',
  platforms: ['desktop'],
  precondition: ['테스트 회원 계정이 있다'],
  params: z.object({
    loginId: z.string().describe('테스트 계정 이메일').optional().meta({ secret: true }),
    password: z.string().describe('테스트 계정 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page, params }) => {
  const 상자 = new 로그인상자(page);
  const 로그인 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 상자.연다();
  });

  await test.step('로그인 화면이 열렸는지 확인한다', async () => {
    await 로그인.제목.waitFor();
    await verify('로그인 화면에 「로그인」 제목이 보인다', await 로그인.제목.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 화면에서 테스트 계정 이메일과 비밀번호를 적고 「로그인」을 누른다', async () => {
    await 상자.적고누른다(params.loginId ?? '', params.password ?? '');
    await 상자.로그인뒤표시.waitFor();
    await verify('맞는 이메일과 비밀번호로 로그인하면 홈 화면에 「Journey Start!」가 보인다', await 상자.로그인뒤표시.isVisible(), true);
  });
});
