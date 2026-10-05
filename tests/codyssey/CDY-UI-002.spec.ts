import { defineCase, test, verify } from '@platform/kit';
import { 로그인상자 } from './components/login.component.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-002',
  name: '로그인 화면에 「로그인」 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 상자 = new 로그인상자(page);
  const 로그인 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 상자.연다();
    await 로그인.제목.waitFor();
    await verify('로그인 화면에 「로그인」 제목이 보인다', await 로그인.제목.isVisible(), true, { blocker: true });

    await 상자.이메일칸.waitFor();
    await verify('자리표시가 「이메일을 입력하세요.」인 입력칸이 보인다', await 상자.이메일칸.isVisible(), true);

    await 상자.비밀번호칸.waitFor();
    await verify('자리표시가 「비밀번호를 입력하세요.」인 입력칸이 보인다', await 상자.비밀번호칸.isVisible(), true);

    await 상자.로그인버튼.waitFor();
    await 로그인.회원가입버튼.waitFor();
    const 버튼보임 = [await 상자.로그인버튼.isVisible(), await 로그인.회원가입버튼.isVisible()];
    await verify('「로그인」 · 「회원가입」 버튼이 보인다', 버튼보임.every(Boolean), true);

    await 로그인.비밀번호찾기링크.waitFor();
    await verify('「비밀번호 찾기」 링크가 보인다', await 로그인.비밀번호찾기링크.isVisible(), true);

    await 로그인.지역문구.waitFor();
    await verify('「서울 계정으로 로그인」 문구가 보인다', await 로그인.지역문구.isVisible(), true);
  });
});
