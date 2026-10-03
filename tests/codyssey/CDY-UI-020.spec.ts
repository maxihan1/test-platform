import { defineCase, test, verify } from '@platform/kit';
import { 제목 } from './components/title.component.js';
import { FAQ화면 } from './pages/faq.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-020',
  name: 'FAQ 화면에 제목과 구분 버튼, 카테고리 선택 상자, 검색어 칸, 질문 목록이 보인다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new FAQ화면(page);
  const 제목부 = new 제목(page);

  await test.step('FAQ 화면을 연다', async () => {
    await 화면.연다();
    await 화면.첫질문제목.waitFor();
    await verify('FAQ 화면에 제목 「FAQ」가 보인다', await 제목부.대제목('FAQ').isVisible(), true);
    await verify(
      'FAQ 화면에 구분 버튼 「AI 올인원」 「AI 네이티브」가 보인다',
      (await 화면.보이는구분버튼(['AI 올인원', 'AI 네이티브'])).join(', '),
      'AI 올인원, AI 네이티브',
    );
    await verify('FAQ 화면의 카테고리 선택 상자에 「전체」가 골라져 있다', await 화면.선택된카테고리('전체').count(), 1);
    await verify('FAQ 화면의 검색어 칸에 안내 「검색어를 입력하세요.」가 보인다', await 화면.검색어칸.isVisible(), true);
    await verify('FAQ 화면의 목록에 질문이 한 건 이상 보인다', (await 화면.질문제목들.count()) > 0, true);
  });
});
