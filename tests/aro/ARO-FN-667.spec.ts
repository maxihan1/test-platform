import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 지금에서, 하루 } from './helpers/notice-log.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 계정번호, 새제재걸기, 적용중제재풀기 } from './helpers/ops-api.helper.js';
import { 기록화면 } from './pages/logs.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-667',
  name: 'qa_player2 에 정지를 걸면 「기록」에 「제재」 · SUSPEND · 「qa_player2 (#2)」 · 「<사유> · 끝 …」 줄이 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    대상아이디: z.string().min(1).describe('제재를 걸거나 지급을 받을 게임 계정 아이디 — 시험용 계정(qa_player2)').default('qa_player2'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 기록화면(page);
  const 사유 = `[QA] ARO-FN-667 ${String(Date.now())}`;
  let 계정 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 대상 계정의 정지를 풀어 둔다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      계정 = await 계정번호(page, params.대상아이디);
      await 적용중제재풀기(page, 계정, 'SUSPEND');
    });

    await test.step('API 로 qa_player2 에 정지를 건 뒤 「기록」에서 그 사유로 찾는다', async () => {
      await 새제재걸기(page, 계정, 'SUSPEND', 사유, 지금에서(하루));
      await 화면.열기();
      await verify('「기록」 표에 줄이 보인다', (await 화면.줄들.count()) > 0, true, { blocker: true });
      await 화면.검색(사유);
      const 칸 = await 화면.칸글(화면.줄들.first());
      const 앞칸 = await verify('그 줄의 메뉴 · 작업 · 대상이 「제재」 · SUSPEND · 「qa_player2 (#2)」 꼴이다', [칸[2], 칸[3], 칸[4]].join(' | '), `제재 | SUSPEND | ${params.대상아이디} (#${String(계정)})`);
      const 내용 = await verify('그 줄의 내용이 「<사유> · 끝 …」 꼴이다', (칸[5] ?? '').startsWith(`${사유} · 끝 `), true);
      await verify('qa_player2 에 정지를 걸면 「기록」에 「제재」 · SUSPEND · 「qa_player2 (#2)」 · 「<사유> · 끝 …」 줄이 보인다', 앞칸 && 내용, true);
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정, 'SUSPEND');
  }
});
