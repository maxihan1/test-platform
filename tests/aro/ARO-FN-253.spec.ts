import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 대상준비, 시험계정, 시험사유 } from './helpers/sanction.helper.js';
import { 새제재걸기, 적용중제재풀기, 제재해제 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-253',
  name: '이미 풀린 정지의 「정지 해제」를 누르면 창 없이 표가 새로 고쳐져 「정지」 버튼이 보인다',
  precondition: ['qa_player2 에 정지가 걸려 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  const 사유 = 시험사유('ARO-FN-253');
  let 계정 = 0;
  let 제재번호 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 대상 계정에 정지를 걸어 둔다', async () => {
      계정 = await 대상준비(page, params.loginId, params.loginPassword);
      제재번호 = await 새제재걸기(page, 계정, 'SUSPEND', 사유);
    });

    await test.step('「유저 · 제재」에서 정지가 걸린 대상 계정 줄을 확인한다', async () => {
      await 화면.열기(`?q=${시험계정}`);
      await verify('대상 계정 줄에 「정지 해제」 버튼이 보인다', await 화면.줄버튼(시험계정, '정지 해제').isVisible(), true, { blocker: true });
    });

    await test.step('유저 표를 연 채 API 로 그 정지를 해제한 뒤 「정지 해제」를 누른다', async () => {
      await 제재해제(page, 제재번호, '[QA] ARO-FN-253 먼저 해제');
      await 화면.줄버튼(시험계정, '정지 해제').click();
      const 정지버튼떴다 = await 화면.줄버튼(시험계정, '정지').waitFor({ timeout: 10_000 }).then(() => true, () => false);
      const 창없음 = await verify('사유 창이 뜨지 않는다', await 화면.창.상자.count(), 0);
      const 정지버튼 = await verify('「정지」 버튼이 보인다', 정지버튼떴다, true);
      await verify('이미 풀린 정지의 「정지 해제」를 누르면 창 없이 표가 새로 고쳐져 「정지」 버튼이 보인다', 창없음 && 정지버튼, true);
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정);
  }
});
