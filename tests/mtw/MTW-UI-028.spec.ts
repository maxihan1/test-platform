import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 정보화면 } from './pages/about.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-028',
  name: '정보 화면에서 「서버 규칙」을 펼치면 등록된 규칙이 하나도 없다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 정보화면(page);

  await test.step('정보 화면을 연다', async () => {
    await 한국어로(page);
    await 화면.열기();
    await verify('정보 화면에 「서버 규칙」 펼침 머리가 보인다', await 화면.구획머리('서버 규칙').isVisible(), true, { blocker: true });
  });

  await test.step('정보 화면에서 「서버 규칙」을 펼친다', async () => {
    await 화면.펼치기('서버 규칙');
    await verify('정보 화면에서 「서버 규칙」을 펼치면 등록된 규칙이 하나도 없다', await 화면.구획항목('서버 규칙').count(), 0);
  });
});
