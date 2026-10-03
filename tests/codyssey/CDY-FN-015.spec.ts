import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 머리 } from './components/header.component.js';
import { 로그인화면 } from './pages/login.page.js';
import { 회원메인화면 } from './pages/main-member.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-015',
  name: '테스트 계정으로 로그인하면 로그인 상태의 메인 화면이 열린다',
  precondition: ['비회원이다', '서울 지역 테스트 계정이 있다'],
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
  const 머리부 = new 머리(page);

  await test.step('로그인 화면을 연다', async () => {
    await 로그인.연다();
  });

  await test.step('로그인 화면의 「로그인」 버튼을 확인한다', async () => {
    await 로그인.로그인버튼.waitFor();
    await verify('로그인 화면에 「로그인」 버튼이 보인다', await 로그인.로그인버튼.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 화면에서 테스트 계정의 아이디와 비밀번호를 적고 「로그인」을 누른다', async () => {
    await 로그인.로그인한다(params.loginId ?? '', params.loginPassword ?? '');
    await 회원메인.사용자이름.waitFor();
    await verify('맞는 아이디와 비밀번호로 로그인하면 메인 화면 주소 「/main/」으로 간다', await 로그인.현재경로(), '/main/');
    await verify('로그인 뒤 머리에 「로그인」 링크가 보이지 않는다', await 머리부.로그인링크.isVisible(), false);
  });
});
