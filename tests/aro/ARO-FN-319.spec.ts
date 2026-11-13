import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 끝날때까지기다리기, 대상준비, 시험사유 } from './helpers/sanction.helper.js';
import { 새제재걸기, 적용중제재풀기 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-319',
  name: '정지의 끝 시각이 지나면 상세 패널 「상태」에 「끝남」 칩이 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  const 사유 = 시험사유('ARO-FN-319');
  let 계정 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 대상 계정의 제재를 풀어 둔다', async () => {
      계정 = await 대상준비(page, params.loginId, params.loginPassword);
    });

    await test.step('대상 계정의 상세 패널을 열어 확인한다', async () => {
      await 화면.상세열기(계정);
      await verify('상세 패널이 열려 있다', await 화면.상세패널.isVisible(), true, { blocker: true });
    });

    await test.step('API 로 끝 시각을 몇 초 뒤로 정지를 걸고 끝 시각이 지난 뒤 상세 패널을 연다', async () => {
      const 끝 = new Date(Date.now() + 5_000).toISOString();
      await 새제재걸기(page, 계정, 'SUSPEND', 사유, 끝);
      await 끝날때까지기다리기(page, 계정, 'SUSPEND', 끝);
      await 화면.상세열기(계정);
      await verify('정지의 끝 시각이 지나면 상세 패널 「상태」에 「끝남」 칩이 보인다', (await 화면.제재상태칩(사유).allInnerTexts()).join(', '), '끝남');
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정);
  }
});
