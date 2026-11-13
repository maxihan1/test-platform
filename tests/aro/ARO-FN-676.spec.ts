import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 새지급, 지급치우기, 지급회수, 캐릭터번호 } from './helpers/ops-api.helper.js';
import { 기록화면 } from './pages/logs.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-676',
  name: '회수하면 「기록」에 「지급 · 회수」 · RECALL · 「지급 #<번호>」 · 「회수 1 · 일부 회수 0 · 이미 수령 0 · <사유>」 줄이 보인다',
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
  const 제목 = `[QA] ARO-FN-676 ${String(Date.now())}`;
  const 회수사유 = `${제목} 회수`;
  let 지급번호 = 0;

  try {
    await test.step('운영자 계정으로 로그인한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    });

    await test.step('API 로 그 지급을 회수한 뒤 「기록」에서 그 회수 사유로 찾는다', async () => {
      const 캐릭터 = await 캐릭터번호(page, params.대상아이디);
      지급번호 = await 새지급(page, { characterIds: [캐릭터], subject: 제목, body: '[QA] ARO-FN-676 내용', items: [{ itemName: '체력 물약', quantity: 1 }], currencyAmount: 0, reason: 제목 });
      const 응답 = await 지급회수(page, 지급번호, 회수사유);
      await verify('지급 회수 요청이 받아들여진다', 응답.status < 300, true, { blocker: true });
      await 화면.열기();
      await verify('「기록」 표에 줄이 보인다', (await 화면.줄들.count()) > 0, true, { blocker: true });
      await 화면.검색(회수사유);
      const 칸 = await 화면.칸글(화면.줄들.first());
      const 앞칸 = await verify('그 줄의 메뉴 · 작업 · 대상이 「지급 · 회수」 · RECALL · 「지급 #<번호>」 꼴이다', [칸[2], 칸[3], 칸[4]].join(' | '), `지급 · 회수 | RECALL | 지급 #${String(지급번호)}`);
      const 내용 = await verify('그 줄의 내용이 「회수 1 · 일부 회수 0 · 이미 수령 0 · <사유>」 꼴이다', (칸[5] ?? '').trim(), `회수 1 · 일부 회수 0 · 이미 수령 0 · ${회수사유}`);
      await verify('회수하면 「기록」에 「지급 · 회수」 · RECALL · 「지급 #<번호>」 · 「회수 1 · 일부 회수 0 · 이미 수령 0 · <사유>」 줄이 보인다', 앞칸 && 내용, true);
    });
  } finally {
    if (지급번호 > 0) await 지급치우기(page, 지급번호);
  }
});
