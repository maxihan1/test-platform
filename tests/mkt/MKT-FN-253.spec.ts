import { defineCase, test, verify } from '@platform/kit';

import { 전체상품 } from './components/shop-helpers.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-253',
  name: '검색칸에 글자를 적고 멈추면 자동완성 목록이 아래에 펼쳐진다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 머리 = new 머리글(page);
  const 상품들 = await 전체상품(page.request);
  const 니트상품 = 상품들
    .filter((상품) => 상품.name.includes('니트'))
    .map((상품) => 상품.name)
    .sort()
    .join(', ');

  await test.step('상품 목록을 연다', async () => {
    await 안내창끄기(page, { 공지: false, 설문: false });
    await 목록.열기();
    await 목록.첫화면기다리기();
    await 머리.로그인링크.waitFor();
    await verify('비회원이다', await 머리.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('상품 검색칸에 「니트」를 적고 0.3초 넘게 기다린다', async () => {
    await 목록.검색칸.fill('니트');
    await 목록.자동완성목록.waitFor();
    await verify('검색칸에 글자를 적고 멈추면 자동완성 목록이 아래에 펼쳐진다', await 목록.자동완성이검색칸아래에있나(), true);
  });

  await test.step('검색칸을 비우고 「니」를 적은 뒤 곧바로 「트」를 더 적는다', async () => {
    await 목록.검색칸.fill('');
    await 목록.자동완성목록.waitFor({ state: 'hidden' });
    await 목록.한글자씩적기('니트');
    await 목록.자동완성목록.waitFor();
    await verify('입력이 바뀌면 마지막 입력 「니트」에 맞는 항목만 보인다', (await 목록.자동완성이름들()).sort().join(', '), 니트상품);
  });

  await test.step('자동완성 목록에서 ESC 를 친다', async () => {
    await 목록.검색칸.press('Escape');
    await verify('ESC 를 치면 자동완성 목록이 닫힌다', await 목록.자동완성목록.isVisible(), false);
  });

  await test.step('자동완성을 다시 펼치고 목록 바깥을 누른다', async () => {
    await 목록.검색칸.fill('');
    await 목록.검색칸.fill('니트');
    await 목록.자동완성목록.waitFor();
    await 목록.제목.click();
    await verify('바깥을 누르면 자동완성 목록이 닫힌다', await 목록.자동완성목록.isVisible(), false);
  });

  await test.step('자동완성을 다시 펼치고 첫 항목을 누른다', async () => {
    await 목록.검색칸.fill('');
    await 목록.검색칸.fill('니트');
    await 목록.자동완성목록.waitFor();
    const 상품명 = await 목록.자동완성항목.first().innerText();
    const 상품번호 = await 목록.자동완성항목.first().getAttribute('data-id');
    await 목록.자동완성항목.first().click();
    await page.getByRole('heading', { name: 상품명, exact: true }).waitFor();
    await verify('자동완성 항목을 누르면 그 상품의 상세 화면으로 간다', new URL(page.url()).pathname, `/shop/${상품번호}`);
  });
});
