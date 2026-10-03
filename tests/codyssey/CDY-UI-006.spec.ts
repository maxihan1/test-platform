import { defineCase, test, verify } from '@platform/kit';
import { 비밀번호찾기화면 } from './pages/password-find.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-006',
  name: '비밀번호 찾기 화면에 제목과 안내 문구, 입력칸, 버튼, 링크가 보인다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 비밀번호찾기화면(page);

  await test.step('비밀번호 찾기 화면을 연다', async () => {
    await 화면.연다();
    await 화면.제목.waitFor();
    await verify('비밀번호 찾기 화면에 제목 「비밀번호 재설정」이 보인다', await 화면.제목.isVisible(), true);
    await verify(
      '비밀번호 찾기 화면에 안내 「비밀번호는 가입하신 메일을 통해 초기화가 가능합니다.」가 보인다',
      await 화면.안내문구.isVisible(),
      true,
    );
    await verify('비밀번호 찾기 화면의 이름 칸에 안내 「이름 입력」이 보인다', await 화면.이름칸.isVisible(), true);
    await verify('비밀번호 찾기 화면의 이메일 칸에 안내 「이메일 입력」이 보인다', await 화면.이메일칸.isVisible(), true);
    await verify('비밀번호 찾기 화면에 「인증 메일 발송」 버튼이 보인다', await 화면.인증메일발송버튼.isVisible(), true);
    await verify('비밀번호 찾기 화면에 「취소하기」 링크가 보인다', await 화면.취소링크.isVisible(), true);
  });
});
