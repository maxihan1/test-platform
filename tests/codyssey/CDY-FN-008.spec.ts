import { defineCase, test, verify } from '@platform/kit';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-008',
  name: '비밀번호 칸에 「sample1234!」를 적고 「비밀번호 보기」를 누르면 적은 글자가 그대로 보인다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 화면.연다();
  });

  await test.step('로그인 화면의 비밀번호 칸을 확인한다', async () => {
    await 화면.비밀번호칸.waitFor();
    await verify('로그인 화면의 비밀번호 칸은 글자를 가린다', await 화면.비밀번호를가리는가(), true, { blocker: true });
  });

  await test.step('비밀번호 칸에 「sample1234!」를 적고 「비밀번호 보기」를 누른다', async () => {
    await 화면.비밀번호를적는다('sample1234!');
    await 화면.비밀번호보기를누른다();
    await 화면.비밀번호숨기기버튼.waitFor();
    await verify(
      '비밀번호 칸에 「sample1234!」를 적고 「비밀번호 보기」를 누르면 적은 글자가 그대로 보인다',
      await 화면.비밀번호칸에보이는글자(),
      'sample1234!',
    );
  });
});
