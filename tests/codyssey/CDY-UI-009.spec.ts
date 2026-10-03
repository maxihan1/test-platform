import { defineCase, test, verify } from '@platform/kit';
import { 코디세이세계관화면 } from './pages/about-world.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-009',
  name: '코디세이 세계관 화면에 제목과 머리글이 보인다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 코디세이세계관화면(page);

  await test.step('코디세이 세계관 화면을 연다', async () => {
    await 화면.연다();
    await 화면.마지막머리글.waitFor();
    await verify('코디세이 세계관 화면에 제목 「코디세이 세계관」이 보인다', await 화면.제목.isVisible(), true);
    await verify('코디세이 세계관 화면에 머리글 「Exploring Together」가 보인다', await 화면.머리글('Exploring Together').isVisible(), true);
    await verify(
      '코디세이 세계관 화면에 머리글 「BRAND」 「IDENTITY」 「STORY」가 보인다',
      (await 화면.보이는머리글(['BRAND', 'IDENTITY', 'STORY'])).join(', '),
      'BRAND, IDENTITY, STORY',
    );
  });
});
