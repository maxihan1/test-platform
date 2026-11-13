import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 새지급, 지급치우기, 캐릭터번호 } from './helpers/ops-api.helper.js';
import { 기록화면 } from './pages/logs.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-673',
  name: '지급하면 「기록」에 「지급 · 회수」 · SEND · 「지급 #<번호> · 캐릭터 1명」 줄이 보인다',
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
  const 제목 = `[QA] ARO-FN-673 ${String(Date.now())}`;
  let 지급번호 = 0;

  try {
    await test.step('운영자 계정으로 로그인한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    });

    await test.step('API 로 qa_player2 에게 지급한 뒤 「기록」에서 그 제목으로 찾는다', async () => {
      const 캐릭터 = await 캐릭터번호(page, params.대상아이디);
      지급번호 = await 새지급(page, { characterIds: [캐릭터], subject: 제목, body: '[QA] ARO-FN-673 내용', items: [{ itemName: '체력 물약', quantity: 1 }], currencyAmount: 0, reason: 제목 });
      await 화면.열기();
      await verify('「기록」 표에 줄이 보인다', (await 화면.줄들.count()) > 0, true, { blocker: true });
      await 화면.검색(제목);
      const 칸 = await 화면.칸글(화면.줄들.first());
      await verify('지급하면 「기록」에 「지급 · 회수」 · SEND · 「지급 #<번호> · 캐릭터 1명」 줄이 보인다', [칸[2], 칸[3], 칸[4]].join(' | '), `지급 · 회수 | SEND | 지급 #${String(지급번호)} · 캐릭터 1명`);
    });
  } finally {
    if (지급번호 > 0) await 지급치우기(page, 지급번호);
  }
});
