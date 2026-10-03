import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 머리 } from './components/header.component.js';
import { 홈화면 } from './pages/home.page.js';
import { 로그인화면 } from './pages/login.page.js';
import { 회원메인화면 } from './pages/main-member.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-019',
  name: '머리 설정 메뉴에서 「로그아웃」을 누르면 로그아웃 상태의 머리로 바뀐다',
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
  const 홈 = new 홈화면(page);
  const 머리부 = new 머리(page);

  await test.step('로그인 화면에서 테스트 계정으로 로그인한다', async () => {
    await 로그인.연다();
    await 로그인.로그인한다(params.loginId ?? '', params.loginPassword ?? '');
  });

  await test.step('머리의 사용자 이름을 확인한다', async () => {
    await 회원메인.사용자이름.waitFor();
    await verify('머리에 사용자 이름이 보인다', await 회원메인.사용자이름.isVisible(), true, { blocker: true });
  });

  await test.step('머리의 설정 버튼을 눌러 「로그아웃」을 누른다', async () => {
    await 회원메인.설정버튼을누른다();
    await 회원메인.설정메뉴('로그아웃').waitFor();
    await verify(
      '머리의 설정 버튼을 누르면 메뉴 「내 정보」 「로그아웃」이 보인다',
      (await 회원메인.보이는설정메뉴(['내 정보', '로그아웃'])).join(', '),
      '내 정보, 로그아웃',
    );
    await 회원메인.로그아웃을누른다();
    await 회원메인.사용자이름.waitFor({ state: 'detached' });
    await 홈.팝업이뜨면기다린다();
    await verify('「로그아웃」을 누르면 머리에 「로그인」 링크가 보인다', await 머리부.로그인링크.isVisible(), true);
  });
});
