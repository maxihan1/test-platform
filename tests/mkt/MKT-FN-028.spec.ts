import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 고객센터화면 } from './pages/support-faq.page.js';

type 질문글 = { question: string; answer: string };

export const spec = defineCase({
  tcId: 'MKT-FN-028',
  name: 'FAQ 검색칸에 글자를 적으면 그 글자가 든 질문만 보이고 맞는 질문이 없으면 안내가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 고객센터화면(page);
  const 머리 = new 머리글(page);
  const 모든질문 = (await (await page.request.get('/api/faq')).json()).items as 질문글[];
  const 글자 = (모든질문[0]?.question ?? '').split(' ')[0] ?? '';
  const 맞는질문들 = 모든질문.filter((글) => 글.question.includes(글자) || 글.answer.includes(글자)).map((글) => 글.question);

  await test.step('FAQ 검색칸에 질문에 든 글자를 적는다', async () => {
    await 화면.열기();
    await 화면.FAQ제목().waitFor();
    await 머리.로그인링크().waitFor();
    await verify('비회원이다', await 화면.검색칸().isVisible(), true, { blocker: true });
    await 화면.검색하기(글자);
    await 화면.질문버튼(맞는질문들[0] ?? '').waitFor();
    const 보이는수 = await 화면.질문버튼들().count();
    const 모두보임: boolean[] = [];
    for (const 질문 of 맞는질문들) 모두보임.push(await 화면.질문버튼(질문).isVisible());
    await verify(
      'FAQ 검색칸에 글자를 적으면 그 글자가 든 질문만 바로 걸러져 보인다',
      [보이는수, 모두보임.every((보임) => 보임)],
      [맞는질문들.length, true],
    );
  });

  await test.step('FAQ 검색칸에 어느 질문에도 없는 글자를 적는다', async () => {
    await 화면.검색하기('없는글자qzxw');
    await 화면.질문버튼(맞는질문들[0] ?? '').waitFor({ state: 'detached' });
    await verify('맞는 질문이 없으면 「검색 결과가 없습니다」가 보인다', await 화면.결과없음문구().isVisible(), true);
  });
});
