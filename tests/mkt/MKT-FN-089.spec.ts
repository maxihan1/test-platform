import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품목록 } from './pages/shop-list.page.js';
import { 상품상세 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-089',
  name: '상품 검색칸에 글자를 입력하고 0.3초 동안 멈추면 자동완성 목록이 최대 5개까지 아래에 펼쳐진다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '자동완성 목록이 펼쳐져 있다'],
  params: z.object({
    query: z.string().min(1).describe('검색어').default('기'),
    pickName: z.string().min(1).describe('누를 자동완성 항목').default('기계식 키보드'),
    otherQuery: z.string().min(1).describe('다시 여는 검색어').default('무선'),
  }),
  expected: z.object({
    maxItems: z.number().describe('자동완성 항목 수').default(5),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 목록 = new 상품목록(page);
  const 상세 = new 상품상세(page);

  await test.step('상품 검색칸에 글자를 적고 0.3초 동안 멈춘다', async () => {
    await 목록.열고기다린다();
    await 목록.검색칸.fill(params.query);
    await 목록.자동완성목록.waitFor();
    await verify(
      '상품 검색칸에 글자를 입력하고 0.3초 동안 멈추면 자동완성 목록이 최대 5개까지 아래에 펼쳐진다',
      await 목록.자동완성항목들.count(),
      expected.maxItems,
    );
  });

  await test.step('자동완성 항목 하나를 누른다', async () => {
    await verify('자동완성 목록이 펼쳐져 있다', await 목록.자동완성목록.isVisible(), true, { blocker: true });
    await 목록.자동완성항목(params.pickName).click();
    await 상세.상품명.waitFor();
    await verify(
      '자동완성 항목을 누르면 그 상품 상세로 간다',
      { 상세로이동: /^\/shop\/\d+$/.test(new URL(page.url()).pathname), 상품명: await 상세.상품명.innerText() },
      { 상세로이동: true, 상품명: params.pickName },
    );
  });

  await test.step('ESC 를 치고 다시 목록을 열어 바깥을 누른다', async () => {
    await 목록.열고기다린다();
    await 목록.검색칸.fill(params.query);
    await 목록.자동완성목록.waitFor();
    await verify('자동완성 목록이 펼쳐져 있다', await 목록.자동완성목록.isVisible(), true, { blocker: true });
    await 목록.검색칸.press('Escape');
    const ESC뒤닫힘 = !(await 목록.자동완성목록.isVisible());
    await 목록.검색칸.fill(params.otherQuery);
    await 목록.자동완성목록.waitFor();
    await 목록.제목.click();
    const 바깥뒤닫힘 = !(await 목록.자동완성목록.isVisible());
    await verify('자동완성 목록은 ESC 나 바깥을 누르면 닫힌다', { ESC: ESC뒤닫힘, 바깥: 바깥뒤닫힘 }, { ESC: true, 바깥: true });
  });
});
