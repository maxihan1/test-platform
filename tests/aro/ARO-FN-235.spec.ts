import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 대상준비, 시험계정, 시험사유 } from './helpers/sanction.helper.js';
import { 적용중제재풀기 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-235',
  name: '「해제할 때까지」를 골라 정지하면 제재 이력의 「끝」에 「해제할 때까지」가 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  const 사유 = 시험사유('ARO-FN-235');
  let 계정 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 대상 계정의 제재를 풀어 둔다', async () => {
      계정 = await 대상준비(page, params.loginId, params.loginPassword);
    });

    await test.step('「유저 · 제재」에서 대상 계정 줄을 확인한다', async () => {
      await 화면.열기(`?q=${시험계정}`);
      await verify('대상 계정 줄에 「정지」 버튼이 보인다', await 화면.줄버튼(시험계정, '정지').isVisible(), true, { blocker: true });
    });

    await test.step('정지 창에서 「해제할 때까지」를 골라 정지한다', async () => {
      await 화면.제재걸기(시험계정, '정지', 사유, '해제할 때까지');
      const 떴다 = await 화면.알림.뜰때까지(`${시험계정} 정지 처리했습니다`);
      await verify('정지 처리 토스트가 뜬다', 떴다, true, { blocker: true });
    });

    await test.step('상세 패널의 제재 이력에서 「끝」을 확인한다', async () => {
      await 화면.상세열기(계정);
      await verify('「해제할 때까지」를 골라 정지하면 제재 이력의 「끝」에 「해제할 때까지」가 보인다', (await 화면.제재끝칸(사유).innerText()).trim(), '해제할 때까지');
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정);
  }
});
