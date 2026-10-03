import { defineCase, test, verify } from '@platform/kit';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-002',
  name: '로그인 화면에 제목과 안내 문구, 입력칸, 버튼, 링크가 보인다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 화면.연다();
    await 화면.제목.waitFor();
    await verify('로그인 화면에 제목 「로그인」이 보인다', await 화면.제목.isVisible(), true);
    await verify('로그인 화면에 문구 「서울 계정으로 로그인」이 보인다', await 화면.안내문구.isVisible(), true);
    await verify('로그인 화면의 아이디 칸에 안내 「이메일을 입력하세요.」가 보인다', await 화면.아이디칸.isVisible(), true);
    await verify('로그인 화면의 비밀번호 칸에 안내 「비밀번호를 입력하세요.」가 보인다', await 화면.비밀번호칸.isVisible(), true);
    await verify('로그인 화면의 비밀번호 칸은 글자를 가린다', await 화면.비밀번호를가리는가(), true);
    await verify('로그인 화면에 「로그인」 버튼이 보인다', await 화면.로그인버튼.isVisible(), true);
    await verify('로그인 화면에 「회원가입」 버튼이 보인다', await 화면.회원가입버튼.isVisible(), true);
    await verify('로그인 화면에 「비밀번호 찾기」 링크가 보인다', await 화면.비밀번호찾기링크.isVisible(), true);
  });
});
