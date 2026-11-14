import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 키보드단축키화면 } from './pages/keyboard-shortcuts.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-263',
  name: '키보드 단축키 화면에 「핫키」 · 「설명」 표가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 키보드단축키화면(page);

  await test.step('키보드 단축키 화면을 연다', async () => {
    await 한국어로(page);
    await 화면.열기();
    await verify('키보드 단축키 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    const 핫키 = await verify('표 머리에 「핫키」가 보인다', await 화면.핫키머리.isVisible(), true);
    const 설명 = await verify('표 머리에 「설명」이 보인다', await 화면.설명머리.isVisible(), true);
    await verify('키보드 단축키 화면에 「핫키」 · 「설명」 표가 보인다', 핫키 && 설명, true);
  });
});
