import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임서버토큰받기, 우편읽기, 채운값, 첨부가져가기, 첨부칸들 } from './helpers/game-api.helper.js';
import { 고유글, 고유접두, 내것지급치우기, 로그인돼있는가, 지급내용만들기 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 새지급, 지급읽기, 캐릭터번호 } from './helpers/ops-api.helper.js';
import { 지급화면 } from './pages/grants.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-469',
  name: '첨부가 일부만 남은 우편을 회수하면 「받는 캐릭터」 칩이 「일부 회수」로 바뀐다',
  precondition: ['qa_player2 에게 「체력 물약」 · 「사슬 갑옷」을 지급했고 게임에서 「체력 물약」 첨부만 가져갔다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    gameServer: z.string().describe('게임 API 서버 주소').optional().meta({ secret: true, account: '게임 서버' }),
    gameServerPass: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
    대상캐릭터: z.string().min(1).describe('지급을 받을 캐릭터 — 시험용 계정(qa_player2)의 캐릭터').default('qa_player2'),
  }),
  expected: z.object({
    칩: z.string().describe('회수 뒤 받는 캐릭터 칩').default('일부 회수'),
    남은첨부칸수: z.number().int().describe('회수 뒤 우편의 첨부 칸 수').default(0),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  const 화면 = new 지급화면(page);
  const 접두 = 고유접두('ARO-FN-469');
  const 글 = 고유글('ARO-FN-469');
  let 캐릭터 = 0;
  let 우편번호 = 0;
  let 토큰 = '';

  try {
    await test.step('qa_player2 에게 두 가지 아이템을 지급하고 게임에서 첫 첨부만 가져간다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 내것지급치우기(page, 접두);
      캐릭터 = await 캐릭터번호(page, params.대상캐릭터);
      const 지급번호 = await 새지급(page, 지급내용만들기(캐릭터, 글, 글, { items: [{ itemName: '체력 물약', quantity: 1 }, { itemName: '사슬 갑옷', quantity: 1 }] }));
      우편번호 = (await 지급읽기(page, 지급번호)).mails[0]?.mailMessageId ?? 0;
      토큰 = await 게임서버토큰받기(request, 채운값(params.gameServer, '게임 서버 주소'), 채운값(params.gameServerPass, '게임 서버 공유 비밀'));
      await 첨부가져가기(request, 채운값(params.gameServer, '게임 서버 주소'), 토큰, 캐릭터, 우편번호, 1);
    });

    await test.step('「체력 물약」 첨부만 가져가 첨부가 일부만 남았는지 확인한다', async () => {
      await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
      const 우편 = await 우편읽기(request, 채운값(params.gameServer, '게임 서버 주소'), 토큰, 캐릭터, 우편번호);
      await verify('우편에 첨부 칸이 하나 남아 있다', 우편 === null ? -1 : 첨부칸들(우편.saveData).length, 1, { blocker: true });
      await 화면.열기();
      await 화면.행(글).waitFor();
      await verify('그 지급 줄에 「회수」 버튼이 있다', await 화면.회수버튼(글).isVisible(), true, { blocker: true });
    });

    await test.step('「지급 · 회수」에서 그 지급을 회수한다', async () => {
      await 화면.회수하기(글, 글);
      await 화면.회수버튼(글).waitFor({ state: 'detached' });
      await verify('첨부가 일부만 남은 우편을 회수하면 「받는 캐릭터」 칩이 「일부 회수」로 바뀐다', (await 화면.칩(글).allInnerTexts()).join(', '), expected.칩);
    });

    await test.step('회수한 뒤 게임 서버 토큰으로 그 우편을 읽는다', async () => {
      const 우편 = await 우편읽기(request, 채운값(params.gameServer, '게임 서버 주소'), 토큰, 캐릭터, 우편번호);
      await verify('일부 회수한 우편은 남아 있다', 우편 !== null, true);
      await verify('남은 첨부가 지워져 그 우편의 첨부 칸이 0개다', 우편 === null ? -1 : 첨부칸들(우편.saveData).length, expected.남은첨부칸수);
    });
  } finally {
    await 내것지급치우기(page, 접두);
  }
});
