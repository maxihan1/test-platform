import { defineCase, test, verify } from '@platform/kit';
import { 올인원모집안내화면 } from './pages/recruitment-all-in-one.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-016',
  name: 'AI 올인원 모집안내 화면에 제목과 머리글이 보인다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 올인원모집안내화면(page);

  await test.step('AI 올인원 모집안내 화면을 연다', async () => {
    await 화면.연다();
    await 화면.마지막머리글.waitFor();
    await verify('AI 올인원 모집안내 화면에 제목 「AI 올인원」이 보인다', await 화면.제목.isVisible(), true);
    await verify('AI 올인원 모집안내 화면에 머리글 「코디세이 AI 올인원 과정」이 보인다', await 화면.과정머리글.isVisible(), true);
    await verify(
      'AI 올인원 모집안내 화면에 머리글 「지원 혜택」 「지원 시 유의사항」이 보인다',
      (await 화면.보이는머리글(['지원 혜택', '지원 시 유의사항'])).join(', '),
      '지원 혜택, 지원 시 유의사항',
    );
  });
});
