import { defineCase, test, verify } from '@platform/kit';
import { 코디세이소개화면 } from './pages/about-intro.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-010',
  name: '코디세이 소개 화면에 제목과 머리글이 보인다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 코디세이소개화면(page);

  await test.step('코디세이 소개 화면을 연다', async () => {
    await 화면.연다();
    await 화면.마지막머리글.waitFor();
    await verify('코디세이 소개 화면에 제목 「코디세이 소개」가 보인다', await 화면.제목.isVisible(), true);
    await verify('코디세이 소개 화면에 머리글 「교육 인재상」이 보인다', await 화면.머리글('교육 인재상').isVisible(), true);
    await verify(
      '코디세이 소개 화면에 머리글 「코디세이란?」 「학습 프로세스」 「학습진도관리」가 보인다',
      (await 화면.보이는머리글(['코디세이란?', '학습 프로세스', '학습진도관리'])).join(', '),
      '코디세이란?, 학습 프로세스, 학습진도관리',
    );
  });
});
