import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 없는주소화면 } from './pages/not-found.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-008',
  name: '없는 주소를 열면 「페이지를 찾을 수 없습니다」 화면과 「홈으로」 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page }) => {
  const 화면 = new 없는주소화면(page);
  const 머리 = new 머리글(page);

  await test.step('없는 주소 /no-such-page 를 연다', async () => {
    await 방해막기(page);
    await 화면.열기();
    await 머리.로그인링크.waitFor();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await verify(
      '없는 주소를 열면 「페이지를 찾을 수 없습니다」 화면과 「홈으로」 버튼이 보인다',
      { 화면: await 화면.제목.isVisible(), 홈으로: await 화면.홈으로.isVisible() },
      { 화면: true, 홈으로: true },
    );
  });
});
