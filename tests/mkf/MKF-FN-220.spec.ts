import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자, 자주묻는질문목록, 하나만맞는말 } from './helpers/shop-tools.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-220',
  name: 'FAQ 검색에 맞는 것이 없으면 「검색 결과가 없습니다」가 보인다',
  techniques: ['경계값 분석'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 센터 = new 고객센터화면(page);

  await test.step('방해 요소를 막고 고객센터를 연다', async () => {
    await 방해막기(page);
    await 센터.열기();
  });

  await test.step('비회원인지 확인한다', async () => {
    await 센터.질문들.first().waitFor();
    await verify('비회원이다', await 세션사용자(page.request), null, { blocker: true });
  });

  await test.step('FAQ 검색칸에 「zzzz」를 적는다', async () => {
    await 센터.검색칸.fill('zzzz');
    await verify('FAQ 검색에 맞는 것이 없으면 「검색 결과가 없습니다」가 보인다', await 센터.검색없음문구.isVisible(), true);
  });

  await test.step('FAQ 검색칸에 FAQ 하나에만 든 글자를 적는다', async () => {
    await 센터.검색칸.fill(하나만맞는말(await 자주묻는질문목록(page.request)));
    await verify('FAQ 검색에 하나만 맞으면 안내 없이 그 FAQ 하나가 보인다', [await 센터.검색없음문구.isVisible(), await 센터.질문들.count()], [false, 1]);
  });
});
