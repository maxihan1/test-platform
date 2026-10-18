import { defineCase, test, verify } from '@platform/kit';
import { 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-260',
  name: 'FAQ 다른 질문을 누르면 먼저 펼친 답은 접히고 새 답만 펼쳐진다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 고객센터 = new 고객센터화면(page);
  let 질문들: string[] = [];

  await test.step('비회원 상태를 확인한다', async () => {
    await 방해창막기(page);
    await verify('세션에 회원이 없다', await 세션회원있는가(page.request), false, { blocker: true });
  });

  await test.step('고객센터 화면을 연다', async () => {
    await 고객센터.열기();
    질문들 = await 고객센터.질문글들();
  });

  await test.step('고객센터 화면이 열렸는지 확인한다', async () => {
    await verify('FAQ 질문이 둘 이상 보인다', 질문들.length >= 2, true, { blocker: true });
  });

  await test.step('FAQ 첫 질문을 펼친 뒤 둘째 질문을 누른다', async () => {
    await 고객센터.질문누르기(질문들[0] ?? '');
    await 고객센터.질문(질문들[0] ?? '', true).waitFor();
    await 고객센터.질문누르기(질문들[1] ?? '');
    await verify(
      'FAQ 다른 질문을 누르면 먼저 펼친 답은 접히고 새 답만 펼쳐진다',
      {
        첫질문접힘: await 고객센터.질문(질문들[0] ?? '', false).isVisible(),
        둘째질문펼침: await 고객센터.질문(질문들[1] ?? '', true).isVisible(),
        펼친답: await 고객센터.펼친답들.count(),
      },
      { 첫질문접힘: true, 둘째질문펼침: true, 펼친답: 1 },
    );
  });
});
