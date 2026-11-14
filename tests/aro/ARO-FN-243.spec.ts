import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 대상준비, 시험사유 } from './helpers/sanction.helper.js';
import { 계정상세읽기, 새제재걸기, 적용중제재풀기, 제재걸기 } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-243',
  name: 'qa_player2 에 정지가 걸린 채 API 로 정지를 한 번 더 걸면 「같은 종류의 제재가 이미 걸려 있습니다. 먼저 해제하세요」가 온다',
  precondition: ['qa_player2 에 정지가 걸려 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  let 계정 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 대상 계정에 정지를 걸어 둔다', async () => {
      계정 = await 대상준비(page, params.loginId, params.loginPassword);
      await 새제재걸기(page, 계정, 'SUSPEND', 시험사유('ARO-FN-243'));
    });

    await test.step('대상 계정에 걸린 정지를 확인한다', async () => {
      await verify('qa_player2 에 정지가 걸려 있다', (await 계정상세읽기(page, 계정)).suspended, true, { blocker: true });
    });

    await test.step('API 로 qa_player2 에 정지를 한 번 더 건다', async () => {
      const 응답 = await 제재걸기(page, 계정, { type: 'SUSPEND', reason: 시험사유('ARO-FN-243'), endsAt: new Date(Date.now() + 3_600_000).toISOString() });
      const 코드 = await verify('응답 코드가 409 이다', 응답.status, 409);
      const 문구 = await verify('안내 문구가 「같은 종류의 제재가 이미 걸려 있습니다. 먼저 해제하세요」다', 응답.body.message, '같은 종류의 제재가 이미 걸려 있습니다. 먼저 해제하세요');
      await verify('qa_player2 에 정지가 걸린 채 API 로 정지를 한 번 더 걸면 「같은 종류의 제재가 이미 걸려 있습니다. 먼저 해제하세요」가 온다', 코드 && 문구, true);
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정);
  }
});
