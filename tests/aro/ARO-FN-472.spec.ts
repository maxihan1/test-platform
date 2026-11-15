import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임서버토큰받기, 채운값, 첨부가져가기 } from './helpers/game-api.helper.js';
import { 고유글, 고유접두, 내것지급치우기, 로그인돼있는가, 지급내용만들기 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 새지급, 지급읽기, 캐릭터번호 } from './helpers/ops-api.helper.js';
import { 지급화면 } from './pages/grants.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-472',
  name: '첨부가 하나도 안 남은 우편을 회수하면 토스트 「회수 0 · 일부 회수 0 · 이미 받음 1」이 뜬다',
  precondition: ['qa_player2 에게 「체력 물약」을 지급했고 「지급 · 회수」에 그 줄의 「회수」 버튼이 보인다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    gameServer: z.string().describe('게임 API 서버 주소').optional().meta({ secret: true, account: '게임 서버' }),
    gameServerPass: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
    대상캐릭터: z.string().min(1).describe('지급을 받을 캐릭터 — 시험용 계정(qa_player2)의 캐릭터').default('qa_player2'),
  }),
  expected: z.object({
    토스트: z.string().describe('회수 결과 토스트').default('회수 0 · 일부 회수 0 · 이미 받음 1'),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  const 화면 = new 지급화면(page);
  const 접두 = 고유접두('ARO-FN-472');
  const 글 = 고유글('ARO-FN-472');
  let 지급번호 = 0;
  let 캐릭터 = 0;

  try {
    await test.step('qa_player2 에게 「체력 물약」을 지급한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 내것지급치우기(page, 접두);
      캐릭터 = await 캐릭터번호(page, params.대상캐릭터);
      지급번호 = await 새지급(page, 지급내용만들기(캐릭터, 글, 글));
    });

    await test.step('「지급 · 회수」에 그 줄의 「회수」 버튼이 보이는지 확인한다', async () => {
      await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
      await 화면.열기();
      await 화면.행(글).waitFor();
      await verify('그 지급 줄에 「회수」 버튼이 있다', await 화면.회수버튼(글).isVisible(), true, { blocker: true });
    });

    await test.step('게임에서 첨부를 모두 가져간 뒤 그 지급을 회수한다', async () => {
      const 서버 = 채운값(params.gameServer, '게임 서버 주소');
      const 토큰 = await 게임서버토큰받기(request, 서버, 채운값(params.gameServerPass, '게임 서버 공유 비밀'));
      const 우편번호 = (await 지급읽기(page, 지급번호)).mails[0]?.mailMessageId ?? 0;
      await 첨부가져가기(request, 서버, 토큰, 캐릭터, 우편번호, 99);
      await verify('게임에서 첨부를 모두 가져가 그 우편 상태가 TAKEN 이다', (await 지급읽기(page, 지급번호)).mails[0]?.status ?? '', 'TAKEN', { blocker: true });
      await 화면.회수하기(글, 글);
      const 글자 = await 화면.알림.아무거나뜰때까지();
      await verify('첨부가 하나도 안 남은 우편을 회수하면 토스트 「회수 0 · 일부 회수 0 · 이미 받음 1」이 뜬다', 글자, expected.토스트);
    });
  } finally {
    await 내것지급치우기(page, 접두);
  }
});
