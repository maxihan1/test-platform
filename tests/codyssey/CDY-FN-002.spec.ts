import { defineCase, test, verify } from '@platform/kit';
import { 머리 } from './components/header.component.js';
import { 제목 } from './components/title.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-002',
  name: '머리 메뉴 「코디세이란」을 누르면 제목 「코디세이 세계관」 화면이 열린다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 홈화면(page);
  const 머리부 = new 머리(page);
  const 제목부 = new 제목(page);

  await test.step('홈 화면을 연다', async () => {
    await 화면.연다();
  });

  await test.step('머리의 「로그인」 링크를 확인한다', async () => {
    await verify('머리에 「로그인」 링크가 보인다', await 머리부.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('머리 메뉴 「코디세이란」을 누른다', async () => {
    await 머리부.메뉴를누른다('코디세이란');
    await 제목부.대제목('코디세이 세계관').waitFor();
    await verify('머리 메뉴 「코디세이란」을 누르면 제목 「코디세이 세계관」 화면이 열린다', await 제목부.대제목('코디세이 세계관').isVisible(), true);
  });
});
