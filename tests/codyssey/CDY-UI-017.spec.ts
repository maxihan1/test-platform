import { defineCase, test, verify } from '@platform/kit';
import { 네이티브모집안내화면 } from './pages/recruitment-ai-native.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-017',
  name: 'AI 네이티브 모집안내 화면에 제목과 머리글, 공고문과 FAQ 버튼이 보인다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 네이티브모집안내화면(page);

  await test.step('AI 네이티브 모집안내 화면을 연다', async () => {
    await 화면.연다();
    await 화면.마지막머리글.waitFor();
    await verify('AI 네이티브 모집안내 화면에 제목 「AI 네이티브」가 보인다', await 화면.제목.isVisible(), true);
    await verify('AI 네이티브 모집안내 화면에 머리글 「코디세이 AI 네이티브 과정」이 보인다', await 화면.머리글('코디세이 AI 네이티브 과정').isVisible(), true);
    await verify(
      'AI 네이티브 모집안내 화면에 머리글 「신청절차」 「지원 혜택」 「지원 시 유의사항」이 보인다',
      (await 화면.보이는머리글(['신청절차', '지원 혜택', '지원 시 유의사항'])).join(', '),
      '신청절차, 지원 혜택, 지원 시 유의사항',
    );
    await verify(
      'AI 네이티브 모집안내 화면에 버튼 「공고문 바로보기」 「공고문 다운로드」 「FAQ」가 보인다',
      (await 화면.보이는버튼(['공고문 바로보기', '공고문 다운로드', 'FAQ'])).join(', '),
      '공고문 바로보기, 공고문 다운로드, FAQ',
    );
  });
});
