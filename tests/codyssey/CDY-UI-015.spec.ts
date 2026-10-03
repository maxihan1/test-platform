import { defineCase, test, verify } from '@platform/kit';
import { 지원혜택화면 } from './pages/benefits.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-015',
  name: '지원혜택 화면에 제목과 머리글, 영상 버튼이 보인다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 지원혜택화면(page);

  await test.step('지원혜택 화면을 연다', async () => {
    await 화면.연다();
    await 화면.마지막머리글.waitFor();
    await verify('지원혜택 화면에 제목 「지원혜택」이 보인다', await 화면.제목.isVisible(), true);
    await verify('지원혜택 화면에 머리글 「누구에게나 열려 있는 기회」가 보인다', await 화면.머리글('누구에게나 열려 있는 기회').isVisible(), true);
    await verify(
      '지원혜택 화면에 머리글 「소개 영상」 「지원혜택」이 보인다',
      (await 화면.보이는머리글(['소개 영상', '지원혜택'])).join(', '),
      '소개 영상, 지원혜택',
    );
    await verify(
      '지원혜택 화면에 버튼 「이전 영상」 「다음 영상」이 보인다',
      (await 화면.보이는버튼(['이전 영상', '다음 영상'])).join(', '),
      '이전 영상, 다음 영상',
    );
  });
});
