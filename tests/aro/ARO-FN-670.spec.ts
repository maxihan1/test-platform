import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 지금에서, 하루 } from './helpers/notice-log.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 계정번호, 새제재걸기, 적용중제재풀기, 제재해제 } from './helpers/ops-api.helper.js';
import { 기록화면 } from './pages/logs.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-670',
  name: '정지를 해제하면 「기록」에 「제재」 · RELEASE · 「#2 SUSPEND」 · 「<해제 사유>」 줄이 보인다',
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
  const 걸사유 = `[QA] ARO-FN-670 ${String(Date.now())} 정지`;
  const 해제사유 = `[QA] ARO-FN-670 ${String(Date.now())} 해제`;
  let 계정 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 대상 계정의 정지를 풀어 둔다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      계정 = await 계정번호(page, params.대상아이디);
      await 적용중제재풀기(page, 계정, 'SUSPEND');
    });

    await test.step('API 로 qa_player2 의 정지를 해제한 뒤 「기록」에서 그 해제 사유로 찾는다', async () => {
      const 제재번호 = await 새제재걸기(page, 계정, 'SUSPEND', 걸사유, 지금에서(하루));
      const 응답 = await 제재해제(page, 제재번호, 해제사유);
      await verify('정지 해제 요청이 받아들여진다', 응답.status < 300, true, { blocker: true });
      await 화면.열기();
      await verify('「기록」 표에 줄이 보인다', (await 화면.줄들.count()) > 0, true, { blocker: true });
      await 화면.검색(해제사유);
      const 칸 = await 화면.칸글(화면.줄들.first());
      const 앞칸 = await verify('그 줄의 메뉴 · 작업 · 대상이 「제재」 · RELEASE · 「#2 SUSPEND」 꼴이다', [칸[2], 칸[3], 칸[4]].join(' | '), `제재 | RELEASE | #${String(계정)} SUSPEND`);
      const 내용 = await verify('그 줄의 내용이 해제 사유다', (칸[5] ?? '').trim(), 해제사유);
      await verify('정지를 해제하면 「기록」에 「제재」 · RELEASE · 「#2 SUSPEND」 · 「<해제 사유>」 줄이 보인다', 앞칸 && 내용, true);
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정, 'SUSPEND');
  }
});
