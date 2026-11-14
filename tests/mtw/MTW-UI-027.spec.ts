import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 정보화면 } from './pages/about.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-027',
  name: '정보 화면에서 「정보」를 펼치면 「이 정보는 이 서버에서 사용할 수 없습니다.」가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 정보화면(page);

  await test.step('정보 화면을 연다', async () => {
    await 한국어로(page);
    await 화면.열기();
    await verify('정보 화면에 「정보」 펼침 머리가 보인다', await 화면.구획머리('정보').isVisible(), true, { blocker: true });
  });

  await test.step('정보 화면에서 「정보」를 펼친다', async () => {
    await 화면.펼치기('정보');
    await verify('정보 화면에서 「정보」를 펼치면 「이 정보는 이 서버에서 사용할 수 없습니다.」가 보인다', await 화면.구획안내('정보').isVisible(), true);
  });
});
