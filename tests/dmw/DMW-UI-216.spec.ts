import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-216',
  name: 'FAQ 질문을 누르면 그 답이 펼쳐진다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 고객센터화면(page);
  let 질문들: string[] = [];

  await test.step('비회원으로 고객센터 화면을 연다', async () => {
    await 안내창막기(page);
    await 화면.열기();
    질문들 = await 화면.질문글들();
    await verify('고객센터 화면이 보인다', await 화면.큰제목.isVisible(), true, { blocker: true });
    await verify('비회원이다', await 로그인한아이디(page.request), null, { blocker: true });
    await verify('질문이 둘 이상 보인다', 질문들.length >= 2, true, { blocker: true });
  });

  await test.step('FAQ 첫 질문을 누른다', async () => {
    await 화면.질문(질문들[0]).click();
    const 펼침 = await verify('누른 질문이 펼쳐진 상태다', await 화면.질문(질문들[0]).getAttribute('aria-expanded'), 'true');
    const 답 = await verify('그 답이 보인다', await 화면.펼친답들.isVisible(), true);
    await verify('FAQ 질문을 누르면 그 답이 펼쳐진다', 펼침 && 답, true);
  });

  await test.step('첫 질문을 펼친 채 둘째 질문을 누른다', async () => {
    await 화면.질문(질문들[1]).click();
    const 앞접힘 = await verify('먼저 펼친 질문은 접힌 상태다', await 화면.질문(질문들[0]).getAttribute('aria-expanded'), 'false');
    const 하나만 = await verify('펼친 답은 하나뿐이다', await 화면.펼친답들.count(), 1);
    await verify('FAQ 다른 질문을 누르면 먼저 펼친 답은 접힌다', 앞접힘 && 하나만, true);
  });
});
