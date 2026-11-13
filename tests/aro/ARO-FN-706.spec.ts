import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 정수글 } from './helpers/notice-log.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 새지급, 지급치우기, 캐릭터번호 } from './helpers/ops-api.helper.js';
import { 기록화면 } from './pages/logs.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-706',
  name: '골드 77 을 지급하면 아이템 흐름의 재화 줄은 「수량」이 비고 「재화」에 77 이 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    대상아이디: z.string().min(1).describe('지급을 받을 게임 계정 아이디 — 시험용 계정(qa_player2)').default('qa_player2'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 기록화면(page);
  const 제목 = `[QA] ARO-FN-706 ${String(Date.now())}`;
  let 지급번호 = 0;

  try {
    await test.step('운영자 계정으로 로그인한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    });

    await test.step('API 로 qa_player2 에게 골드 77 을 지급한 뒤 아이템 흐름을 본다', async () => {
      const 캐릭터 = await 캐릭터번호(page, params.대상아이디);
      지급번호 = await 새지급(page, { characterIds: [캐릭터], subject: 제목, body: '[QA] ARO-FN-706 내용', items: [], currencyAmount: 77, reason: 제목 });
      await 화면.열기('?tab=items');
      const 보인다 = await 화면.흐름줄(지급번호, '지급').first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('그 지급 번호의 「지급」 줄이 아이템 흐름에 보인다', 보인다, true, { blocker: true });
      const 칸 = await 화면.칸글(화면.흐름줄(지급번호, '지급').first());
      const 수량 = await verify('그 줄의 「수량」이 비어 있다', (칸[4] ?? '').trim(), '');
      const 재화 = await verify('그 줄의 「재화」에 77 이 보인다', (칸[5] ?? '').trim(), 정수글(77));
      await verify('골드 77 을 지급하면 아이템 흐름의 재화 줄은 「수량」이 비고 「재화」에 77 이 보인다', 수량 && 재화, true);
    });
  } finally {
    if (지급번호 > 0) await 지급치우기(page, 지급번호);
  }
});
