import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유글, 고유접두, 내것지급치우기, 로그인돼있는가, 지급내용만들기 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 글자, 새지급, 지급읽기, 지급회수, 캐릭터번호 } from './helpers/ops-api.helper.js';
import { 지급화면 } from './pages/grants.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-482',
  name: '회수 사유를 비우고 「회수」를 누르면 토스트 「회수 사유를 1~200자로 입력하세요」가 뜬다',
  techniques: ['경계값 분석'],
  precondition: ['qa_player2 에게 보낸 안 받은 지급이 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    짧은회수사유길이: z.number().int().min(1).max(200).describe('회수 사유 글자 수 — 1~200').default(1),
    긴회수사유길이: z.number().int().min(1).max(200).describe('회수 사유 글자 수 — 1~200').default(200),
    넘는회수사유길이: z.number().int().min(201).max(500).describe('API 로 보낼 회수 사유 글자 수 — 201~500').default(201),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 지급화면(page);
  const 접두 = 고유접두('ARO-FN-482');
  const 글 = 고유글('ARO-FN-482');
  let 번호들: number[] = [];

  try {
    await test.step('운영자 계정으로 로그인한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
      await 내것지급치우기(page, 접두);
    });

    await test.step('「지급 · 회수」 화면에서 보낸 지급 줄을 확인한다', async () => {
      const 캐릭터 = await 캐릭터번호(page, 'qa_player2');
      번호들 = [await 새지급(page, 지급내용만들기(캐릭터, `${글} A`, 글)), await 새지급(page, 지급내용만들기(캐릭터, `${글} B`, 글)), await 새지급(page, 지급내용만들기(캐릭터, `${글} C`, 글))];
      await 화면.열기();
      await 화면.행(`${글} C`).waitFor();
      const 버튼들 = [await 화면.회수버튼(`${글} A`).isVisible(), await 화면.회수버튼(`${글} B`).isVisible(), await 화면.회수버튼(`${글} C`).isVisible()];
      await verify('qa_player2 에게 보낸 안 받은 지급이 있다', 버튼들.join(', '), 'true, true, true', { blocker: true });
    });

    await test.step('회수 사유를 비우고 「회수」를 누른다', async () => {
      await 화면.회수하기(`${글} A`, '');
      const 떴다 = await 화면.알림.뜰때까지('회수 사유를 1~200자로 입력하세요');
      await verify('회수 사유를 비우고 「회수」를 누르면 토스트 「회수 사유를 1~200자로 입력하세요」가 뜬다', 떴다, true);
    });

    await test.step('회수 사유 1자로 회수한다', async () => {
      await 화면.회수하기(`${글} B`, 글자(params.짧은회수사유길이));
      await 화면.회수버튼(`${글} B`).waitFor({ state: 'detached' });
      await verify('회수 사유 1자로 회수된다', (await 지급읽기(page, 번호들[1] ?? 0)).recalledAt !== null, true);
    });

    await test.step('회수 사유 200자로 회수한다', async () => {
      await 화면.회수하기(`${글} C`, 글자(params.긴회수사유길이));
      await 화면.회수버튼(`${글} C`).waitFor({ state: 'detached' });
      await verify('회수 사유 200자로 회수된다', (await 지급읽기(page, 번호들[2] ?? 0)).recalledAt !== null, true);
    });

    await test.step('API 로 회수 사유 201자를 보낸다', async () => {
      const 응답 = await 지급회수(page, 번호들[0] ?? 0, 글자(params.넘는회수사유길이));
      await verify('회수 사유 201자는 「회수 사유를 1~200자로 입력하세요」로 거절된다', String(응답.body.message), '회수 사유를 1~200자로 입력하세요');
    });
  } finally {
    await 내것지급치우기(page, 접두);
  }
});
