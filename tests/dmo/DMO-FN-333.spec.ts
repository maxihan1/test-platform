import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './helpers/account.helper.js';
import { 상품가격저장시도, 세션읽기 } from './helpers/users-flow.helper.js';
import { 상품고치기, 상품목록 } from './helpers/ops-data.helper.js';
import { 변경기록화면 } from './pages/audit.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-333',
  name: '실패한 저장은 변경 기록에 새 줄을 남기지 않는다',
  platforms: ['desktop', 'mobile'],
  techniques: ['동등 분할'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
    가격: z.number().int().describe('저장해 볼 상품 가격(원) — 1~99원').default(50),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 변경 = new 변경기록화면(page);
  let 상품이름 = '';
  let 이전줄수 = 0;

  await test.step('관리자 계정으로 로그인해 있고 변경 기록의 그 상품 줄 수를 읽어 둔다', async () => {
    await API로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    await verify('관리자 계정으로 로그인해 있다', (await 세션읽기(page))?.role, 'admin', { blocker: true });
    const 상품들 = await 상품목록(page);
    상품이름 = 상품들[상품들.length - 1]?.name ?? '';
    await 변경.열기();
    await 변경.검색하기(상품이름);
    이전줄수 = await 변경.줄들.count();
    await verify('변경 기록 화면이 보인다', await 변경.제목.isVisible(), true, { blocker: true });
  });

  await test.step('상품 가격을 50원으로 저장해 실패한 뒤 변경 기록에서 그 상품을 찾는다', async () => {
    const 원래 = (await 상품목록(page)).find((상품) => 상품.name === 상품이름);
    if (!원래) throw new Error(`운영툴 상품 목록에 ${상품이름} 이 없다`);
    try {
      await 상품가격저장시도(page, 원래, params.가격);
    } finally {
      const 지금 = (await 상품목록(page)).find((상품) => 상품.id === 원래.id);
      if (지금 && 지금.price !== 원래.price) await 상품고치기(page, 원래);
    }
    await 변경.열기();
    await 변경.검색하기(상품이름);
    await verify('실패한 저장은 변경 기록에 새 줄을 남기지 않는다', await 변경.줄들.count(), 이전줄수);
  });
});
