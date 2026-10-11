import { defineCase, test, verify } from '@platform/kit';

import { 보이는글, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 없는화면 } from './pages/not-found.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-016',
  name: '없는 주소를 열면 「페이지를 찾을 수 없습니다」와 「홈으로」 버튼이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page }) => {
  const 없는 = new 없는화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('없는 주소 /no-such-page 를 연다', async () => {
    await 방해막기(page);
    await 없는.열기();
    await 없는.홈으로.waitFor();
    await verify(
      '없는 주소를 열면 「페이지를 찾을 수 없습니다」와 「홈으로」 버튼이 보인다',
      { 제목: await 보이는글(없는.제목), 홈으로버튼: await 없는.홈으로.isVisible() },
      { 제목: '페이지를 찾을 수 없습니다', 홈으로버튼: true },
    );
  });
});
