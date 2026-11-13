import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 대상준비, 시험사유 } from './helpers/sanction.helper.js';
import { 새제재걸기, 적용중제재풀기, 제재해제 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-328',
  name: '정지를 걸고 상세 패널을 열면 「적용 중」 줄에만 「해제」 버튼이 있고 「해제」 상태 줄에는 없다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  const 푼사유 = 시험사유('ARO-FN-328 해제됨');
  const 건사유 = 시험사유('ARO-FN-328 적용중');
  let 계정 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 대상 계정의 제재를 풀어 둔다', async () => {
      계정 = await 대상준비(page, params.loginId, params.loginPassword);
    });

    await test.step('대상 계정의 상세 패널을 열어 확인한다', async () => {
      await 화면.상세열기(계정);
      await verify('상세 패널이 열려 있다', await 화면.상세패널.isVisible(), true, { blocker: true });
    });

    await test.step('qa_player2 에 정지를 걸고 상세 패널을 연다', async () => {
      const 푼번호 = await 새제재걸기(page, 계정, 'SUSPEND', 푼사유);
      await 제재해제(page, 푼번호, '[QA] ARO-FN-328 먼저 해제');
      await 새제재걸기(page, 계정, 'SUSPEND', 건사유);
      await 화면.상세열기(계정);
      await verify('해제 상태 줄이 제재 이력에 있다', await 화면.제재행(푼사유).count(), 1, { blocker: true });
      const 적용중 = await verify('「적용 중」 줄에 「해제」 버튼이 보인다', await 화면.제재행해제버튼(건사유).isVisible(), true);
      const 해제됨 = await verify('「해제」 상태 줄에 「해제」 버튼이 없다', await 화면.제재행해제버튼(푼사유).count(), 0);
      await verify('정지를 걸고 상세 패널을 열면 「적용 중」 줄에만 「해제」 버튼이 있고 「해제」 상태 줄에는 없다', 적용중 && 해제됨, true);
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정);
  }
});
