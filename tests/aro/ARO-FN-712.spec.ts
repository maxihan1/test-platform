import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임서버토큰받기, 채운값, 첨부가져가기 } from './helpers/game-api.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 새지급, 지급읽기, 지급치우기, 캐릭터번호 } from './helpers/ops-api.helper.js';
import { 기록화면 } from './pages/logs.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-712',
  name: '게임에서 첨부를 가져가면 아이템 흐름에 그 지급 번호의 「수령」 줄이 보인다',
  precondition: ['qa_player2 에게 「체력 물약」을 지급했다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    gameServer: z.string().describe('게임 API 서버 주소').optional().meta({ secret: true, account: '게임 서버' }),
    gameServerPass: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
    대상캐릭터: z.string().min(1).describe('지급을 받을 캐릭터 — 시험용 계정(qa_player2)의 캐릭터').default('qa_player2'),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 화면 = new 기록화면(page);
  const 제목 = `[QA] ARO-FN-712 ${String(Date.now())}`;
  let 지급번호 = 0;
  let 캐릭터 = 0;

  try {
    await test.step('qa_player2 에게 「체력 물약」을 지급한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      캐릭터 = await 캐릭터번호(page, params.대상캐릭터);
      지급번호 = await 새지급(page, { characterIds: [캐릭터], subject: 제목, body: '', items: [{ itemName: '체력 물약', quantity: 1 }], currencyAmount: 0, reason: 제목 });
    });

    await test.step('그 지급이 안 받은 우편으로 갔는지 확인한다', async () => {
      await verify('그 지급의 우편 상태가 SENT 다', (await 지급읽기(page, 지급번호)).mails[0]?.status ?? '', 'SENT', { blocker: true });
    });

    await test.step('게임 서버 토큰으로 첨부를 비운 그 우편을 저장한 뒤 「아이템 흐름」을 본다', async () => {
      const 서버 = 채운값(params.gameServer, '게임 서버 주소');
      const 토큰 = await 게임서버토큰받기(request, 서버, 채운값(params.gameServerPass, '게임 서버 공유 비밀'));
      const 우편번호 = (await 지급읽기(page, 지급번호)).mails[0]?.mailMessageId ?? 0;
      await 첨부가져가기(request, 서버, 토큰, 캐릭터, 우편번호, 99);
      await 화면.열기('?tab=items');
      const 보인다 = await 화면.흐름줄(지급번호, '수령').first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('게임에서 첨부를 가져가면 아이템 흐름에 그 지급 번호의 「수령」 줄이 보인다', 보인다, true);
    });

    await test.step('그 「수령」 줄의 「누가」 칸을 본다', async () => {
      const 칸 = await 화면.칸글(화면.흐름줄(지급번호, '수령').first());
      await verify('「수령」 줄의 「누가」는 받은 캐릭터 이름 qa_player2 다', 칸[7] ?? '', params.대상캐릭터);
    });
  } finally {
    if (지급번호 > 0) await 지급치우기(page, 지급번호);
  }
});
