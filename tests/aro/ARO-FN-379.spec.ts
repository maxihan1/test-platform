import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유글, 고유접두, 내것지급치우기, 로그인돼있는가 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 지급화면 } from './pages/grants.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-379',
  name: '아이템과 골드 없이 「보내기」를 누르면 확인 창 요약이 「내용 없음」이다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 지급화면(page);
  const 접두 = 고유접두('ARO-FN-379');
  const 제목 = 고유글('ARO-FN-379');

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

    await test.step('qa_player2 를 고르고 아이템 이름과 골드를 비운 채 「보내기」를 누른다', async () => {
      await 화면.폼채우기({ 캐릭터: 'qa_player2', 제목, 사유: 제목 });
      await 화면.보내기눌러확인창뜰때까지();
      await verify('아이템과 골드 없이 「보내기」를 누르면 확인 창 요약이 「내용 없음」이다', await 화면.창.본문.innerText(), `1명에게 「${제목}」(내용 없음) 우편을 보낼까요?`);
      await 화면.창.누르기('닫기');
    });
  } finally {
    await 내것지급치우기(page, 접두);
  }
});
