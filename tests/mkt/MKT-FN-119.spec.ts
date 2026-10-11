import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { FAQ읽기, 하나만맞는검색어 } from './helpers/home.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-119',
  name: 'FAQ 검색에 맞는 것이 없으면 「검색 결과가 없습니다」 가 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page }) => {
  const 고객센터 = new 고객센터화면(page);
  const 머리 = new 머리글(page);

  await test.step('FAQ 검색칸에 맞는 것이 없는 글자를 적는다', async () => {
    await 방해막기(page);
    await 고객센터.열기();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await 고객센터.검색칸.fill('zzzzqx');
    await verify('FAQ 검색에 맞는 것이 없으면 「검색 결과가 없습니다」 가 보인다', await 고객센터.빈결과.isVisible(), true);
  });

  await test.step('FAQ 검색칸에 맞는 것이 하나인 글자를 적는다', async () => {
    const 검색어 = 하나만맞는검색어(await FAQ읽기(page.request));
    await 고객센터.검색칸.fill(검색어);
    await verify(
      'FAQ 검색에 맞는 것이 하나면 질문 하나만 보이고 「검색 결과가 없습니다」 는 보이지 않는다',
      { 질문수: await 고객센터.질문들.count(), 빈결과: await 고객센터.빈결과.isVisible() },
      { 질문수: 1, 빈결과: false },
    );
  });
});
