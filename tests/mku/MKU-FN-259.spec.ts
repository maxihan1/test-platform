import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자, 자주묻는질문목록, 하나만맞는말 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-259',
  name: 'FAQ 검색에 맞는 것이 없으면 「검색 결과가 없습니다」가 보인다',
  techniques: ['경계값 분석'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 센터 = new 고객센터화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  await test.step('고객센터 화면을 준비한다', async () => {
    await 센터.열기();
  });

  await test.step('고객센터 화면이 떴는지 확인한다', async () => {
    await 센터.질문들.first().waitFor();
    await verify('고객센터 화면에 질문이 보인다', await 센터.질문들.first().isVisible(), true, { blocker: true });
  });

  await test.step('FAQ 검색칸에 맞는 것이 없는 글자를 적는다', async () => {
    await 센터.검색칸.fill('zzzz');
    await verify('FAQ 검색에 맞는 것이 없으면 「검색 결과가 없습니다」가 보인다', await 센터.검색없음문구.isVisible(), true);
  });

  await test.step('FAQ 검색칸에 질문 하나에만 든 글자를 적는다', async () => {
    await 센터.검색칸.fill(하나만맞는말(await 자주묻는질문목록(page.request)));
    await verify('FAQ 검색에 맞는 것이 하나면 「검색 결과가 없습니다」 없이 질문 하나가 보인다', [await 센터.검색없음문구.isVisible(), await 센터.질문들.count()], [false, 1]);
  });
});
