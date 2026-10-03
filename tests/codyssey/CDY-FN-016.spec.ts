import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 로그인화면 } from './pages/login.page.js';
import { 회원메인화면 } from './pages/main-member.page.js';
import { 내정보화면 } from './pages/my-info.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-016',
  name: '머리의 사용자 이름을 누르면 제목 「내 정보」 화면이 열린다',
  precondition: ['서울 계정으로 로그인해 있다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: z.object({
    loginId: z.string().describe('테스트 계정 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('테스트 계정 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인화면(page);
  const 회원메인 = new 회원메인화면(page);
  const 내정보 = new 내정보화면(page);

  await test.step('로그인 화면에서 테스트 계정으로 로그인한다', async () => {
    await 로그인.연다();
    await 로그인.로그인한다(params.loginId ?? '', params.loginPassword ?? '');
  });

  await test.step('머리의 사용자 이름을 확인한다', async () => {
    await 회원메인.사용자이름.waitFor();
    await verify('머리에 사용자 이름이 보인다', await 회원메인.사용자이름.isVisible(), true, { blocker: true });
  });

  await test.step('머리의 사용자 이름을 누른다', async () => {
    await 회원메인.사용자이름을누른다();
    await 내정보.제목.waitFor();
    await verify('머리의 사용자 이름을 누르면 제목 「내 정보」 화면이 열린다', await 내정보.제목.isVisible(), true);
  });
});
