import { defineCase, test, verify } from '@platform/kit';

import { 머리글부품 } from './components/header.component.js';
import { 지원혜택화면 } from './pages/benefits.page.js';
import { 세계관화면 } from './pages/world.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-019',
  name: '머리 메뉴 「과정소개」의 하위 메뉴 「지원혜택」을 누르면 「지원혜택」 화면 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['코디세이 세계관 화면이 열려 있다', '비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 세계관 = new 세계관화면(page);
  const 머리글 = new 머리글부품(page);
  const 지원혜택 = new 지원혜택화면(page);

  await test.step('코디세이 세계관 화면을 연다', async () => {
    await 세계관.열기();
  });

  await test.step('코디세이 세계관 화면의 제목을 확인한다', async () => {
    const 제목보임 = await 세계관.제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('코디세이 세계관 화면에 제목 「코디세이 세계관」이 보인다', 제목보임, true, { blocker: true });
  });

  await test.step('「과정소개」 메뉴에 마우스를 올리고 하위 메뉴 「지원혜택」을 누른다', async () => {
    await 머리글.메뉴에_올리기('과정소개');
    await 머리글.메뉴('지원혜택').click();

    const 제목보임 = await 지원혜택.제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('머리 메뉴 「과정소개」의 하위 메뉴 「지원혜택」을 누르면 「지원혜택」 화면 제목이 보인다', 제목보임, true);
  });
});
