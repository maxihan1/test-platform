import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 정보화면 } from './pages/about.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-030',
  name: '정보 화면 서버 배너에 「서버 통계:」와 활성 사용자 수가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 정보화면(page);

  await test.step('정보 화면을 연다', async () => {
    await 한국어로(page);
    await 화면.열기();
    await verify('정보 화면에 서버 이름이 보인다', await 화면.서버이름.isVisible(), true, { blocker: true });
    const 제목 = await verify('서버 배너에 「서버 통계:」가 보인다', await 화면.통계제목.isVisible(), true);
    const 수 = await verify('서버 배너에 활성 사용자 수가 보인다', await 화면.활성사용자수.isVisible(), true);
    const 글 = await verify('서버 배너에 「활성 사용자」가 보인다', await 화면.활성사용자.isVisible(), true);
    await verify('정보 화면 서버 배너에 「서버 통계:」와 활성 사용자 수가 보인다', 제목 && 수 && 글, true);
  });
});
