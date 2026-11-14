import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 정보화면 } from './pages/about.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-026',
  name: '정보 화면에 「관리자:」 · 「연락처:」가 보인다',
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
    const 관리자 = await verify('정보 화면에 「관리자:」가 보인다', await 화면.관리자제목.isVisible(), true);
    const 연락처 = await verify('정보 화면에 「연락처:」가 보인다', await 화면.연락처제목.isVisible(), true);
    await verify('정보 화면에 「관리자:」 · 「연락처:」가 보인다', 관리자 && 연락처, true);
    const 관리자값 = await verify('「관리자:」 값은 비어 있다', (await 화면.관리자영역.innerText()).replace('관리자:', '').trim(), '');
    const 연락처값 = await verify('「연락처:」 값은 비어 있다', (await 화면.연락처영역.innerText()).replace('연락처:', '').trim(), '');
    await verify('「관리자:」 · 「연락처:」 값은 비어 있다', 관리자값 && 연락처값, true);
  });
});
