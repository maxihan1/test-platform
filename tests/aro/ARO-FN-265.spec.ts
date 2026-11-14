import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 대상준비, 시험사유 } from './helpers/sanction.helper.js';
import { 새제재걸기, 적용중제재풀기, 제재해제 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-265',
  name: '정지를 해제하면 제재 이력에 그 정지가 그대로 남고 해제 일시 · qa_ops · 해제 사유가 붙는다',
  precondition: ['qa_player2 에 정지가 걸려 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    해제사유: z.string().min(1).max(200).describe('해제 사유 — 1~200자, 가운데 점(·)이 없는 글').default('[QA] ARO-FN-265 해제'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  const 사유 = 시험사유('ARO-FN-265');
  let 계정 = 0;
  let 제재번호 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 대상 계정에 정지를 걸어 둔다', async () => {
      계정 = await 대상준비(page, params.loginId, params.loginPassword);
      제재번호 = await 새제재걸기(page, 계정, 'SUSPEND', 사유);
    });

    await test.step('상세 패널의 제재 이력에서 걸어 둔 정지를 확인한다', async () => {
      await 화면.상세열기(계정);
      await verify('걸어 둔 정지 줄에 「해제」 버튼이 보인다', await 화면.제재행해제버튼(사유).isVisible(), true, { blocker: true });
    });

    await test.step('정지를 해제하고 상세 패널을 연다', async () => {
      const 응답 = await 제재해제(page, 제재번호, params.해제사유);
      const 해제시각 = new Date(String(응답.body.releasedAt)).getTime();
      await 화면.상세열기(계정);
      const 남음 = await verify('해제한 정지가 제재 이력에 그대로 남는다', await 화면.제재행(사유).count(), 1);
      const 붙음 = await verify('해제 일시 · qa_ops · 해제 사유가 붙는다', (await 화면.제재상태작은글(사유).innerText()).trim(), `${await 화면.시각표기(해제시각)} · qa_ops · ${params.해제사유}`);
      await verify('정지를 해제하면 제재 이력에 그 정지가 그대로 남고 해제 일시 · qa_ops · 해제 사유가 붙는다', 남음 && 붙음, true);
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정);
  }
});
