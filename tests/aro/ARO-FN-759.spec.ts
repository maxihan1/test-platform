import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유글, 고유접두, 글자로지급찾기, 내것지급치우기, 로그인돼있는가 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 지급화면 } from './pages/grants.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-759',
  name: '확인 창의 「보내기」를 빠르게 두 번 누르면 지급 이력에 새 지급이 하나만 생긴다',
  techniques: ['오류 추정'],
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 지급화면(page);
  const 접두 = 고유접두('ARO-FN-759');
  const 글 = 고유글('ARO-FN-759');

  try {
    await test.step('운영자 계정으로 로그인한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
      await 내것지급치우기(page, 접두);
    });

    await test.step('「지급 · 회수」 화면을 연다', async () => {
      await 화면.열기();
      await verify('「우편으로 보내기」 폼이 보인다', await 화면.폼제목.isVisible(), true, { blocker: true });
    });

    await test.step('지급 확인 창의 「보내기」를 빠르게 두 번 누른다', async () => {
      await 화면.폼채우기({ 캐릭터: 'qa_player2', 아이템: [{ 이름: '체력 물약', 수량: 1 }], 제목: 글, 사유: 글 });
      await 화면.보내기눌러확인창뜰때까지();
      await 화면.확인창에서빠르게두번보내기();
      await 화면.알림.뜰때까지(/^지급 #\d+ 우편을 1명에게 보냈습니다$/);
      await 화면.행(글).first().waitFor();
      await verify('확인 창의 「보내기」를 빠르게 두 번 누르면 지급 이력에 새 지급이 하나만 생긴다', (await 글자로지급찾기(page, 글)).length, 1);
    });
  } finally {
    await 내것지급치우기(page, 접두);
  }
});
