import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 대상준비, 시험사유 } from './helpers/sanction.helper.js';
import { 새제재걸기, 적용중제재풀기, 제재해제 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-322',
  name: '정지를 해제하면 「상태」에 「해제」 칩과 해제 일시 · qa_ops · 사유가 작은 글씨로 보인다',
  precondition: ['qa_player2 에 정지가 걸려 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    해제사유: z.string().min(1).max(200).describe('해제 사유 — 1~200자, 가운데 점(·)이 없는 글').default('[QA] ARO-FN-322 해제'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  const 사유 = 시험사유('ARO-FN-322');
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

    await test.step('정지를 해제하고 상세 패널의 그 줄을 본다', async () => {
      const 응답 = await 제재해제(page, 제재번호, params.해제사유);
      const 해제시각 = new Date(String(응답.body.releasedAt)).getTime();
      await 화면.상세열기(계정);
      const 칩 = await verify('상태 칩이 「해제」다', (await 화면.제재상태칩(사유).allInnerTexts()).join(', '), '해제');
      const 작은글 = await verify('칩 옆 작은 글씨가 해제 일시 · qa_ops · 사유다', (await 화면.제재상태작은글(사유).innerText()).trim(), `${await 화면.시각표기(해제시각)} · qa_ops · ${params.해제사유}`);
      await verify('정지를 해제하면 「상태」에 「해제」 칩과 해제 일시 · qa_ops · 사유가 작은 글씨로 보인다', 칩 && 작은글, true);
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정);
  }
});
