import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 새회원정보, 회원정리 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 나타났나 } from './helpers/visual.helper.js';
import { 가입완료화면, 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-100',
  name: '가입에 성공하면 가입 완료 화면에 「<이름>님, 가입을 환영합니다」와 「로그인하러 가기」 버튼이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
  params: z.object({
    이름: z.string().describe('가입할 이름 — 2~10자').default('홍길동'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 가입 = new 회원가입화면(page);
  const 완료 = new 가입완료화면(page);
  const 정보 = { ...새회원정보(), name: params.이름 };
  let 가입했다 = false;

  try {
    await test.step('회원가입 화면을 연다', async () => {
      await 방해창막기(page);
      await 가입.열기();
      await verify('회원가입 화면 제목 「회원가입」이 보인다', await 가입.제목.isVisible(), true, { blocker: true });
    });

    await test.step('필수 칸을 채우고 「가입하기」를 누른다', async () => {
      await 가입.필수칸채우기(정보);
      await 가입.중복확인하기();
      await 가입.안내('loginId').getByText('사용 가능한 아이디입니다').waitFor();
      await 가입.필수약관켜기();
      await verify('「가입하기」 버튼이 눌린다', await 가입.가입하기버튼.isEnabled(), true, { blocker: true });
      가입했다 = true;
      await 가입.가입하기버튼.click();
      await 완료.제목.waitFor();
      await verify(
        '가입에 성공하면 가입 완료 화면에 「<이름>님, 가입을 환영합니다」와 「로그인하러 가기」 버튼이 보인다',
        { 환영문구: (await 완료.환영문구.innerText()).trim(), 로그인하러가기: await 나타났나(완료.로그인하러가기) },
        { 환영문구: `${정보.name}님, 가입을 환영합니다`, 로그인하러가기: true },
      );
    });
  } finally {
    if (가입했다) await 회원정리(page.request, 정보);
  }
});
