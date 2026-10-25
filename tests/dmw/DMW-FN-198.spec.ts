import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-198',
  name: '검색칸에 적고 0.3초 멈추면 검색칸 아래에 자동완성 목록이 펼쳐진다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    검색어: z.string().describe('상품 검색어 — 이름에 들어 있는 글자, 후보가 한 건 이상 나오는 것').default('데모'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 상품목록화면(page);
  await 안내창막기(page);

  await test.step('상품 검색칸에 「데모」를 적고 0.3초 기다린다', async () => {
    await 목록.열기();
    await verify('화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await 목록.검색어쓰기(params.검색어);
    await 목록.자동완성목록.waitFor();
    const 보임 = await verify('자동완성 목록이 보인다', await 목록.자동완성목록.isVisible(), true);
    const 칸 = await 목록.검색칸.boundingBox();
    const 목록상자 = await 목록.자동완성목록.boundingBox();
    const 아래 = await verify('자동완성 목록이 검색칸 아래에 있다', 칸 !== null && 목록상자 !== null && 목록상자.y >= 칸.y + 칸.height - 1, true);
    await verify('검색칸에 적고 0.3초 멈추면 검색칸 아래에 자동완성 목록이 펼쳐진다', 보임 && 아래, true);
  });
});
