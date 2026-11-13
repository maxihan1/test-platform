import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유글, 고유접두, 내것지급치우기, 로그인돼있는가 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 지급화면 } from './pages/grants.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-396',
  name: '지급 사유를 비워 지급이 실패하면 받는 캐릭터 · 아이템 · 제목 값이 그대로 남는다',
  techniques: ['동등 분할'],
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 지급화면(page);
  const 접두 = 고유접두('ARO-FN-396');
  const 제목 = 고유글('ARO-FN-396');

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

    await test.step('지급 사유를 비우고 나머지를 적어 보낸다', async () => {
      await 화면.채워서보내기({ 캐릭터: 'qa_player2', 아이템: [{ 이름: '체력 물약', 수량: 1 }], 제목, 사유: '' });
      const 실패 = await 화면.알림.뜰때까지('지급 사유를 1~200자로 입력하세요');
      await verify('지급이 실패한다', 실패, true, { blocker: true });
      const 고른 = await verify('받는 캐릭터 값이 그대로 남는다', (await 화면.고른것들.allInnerTexts()).map((글) => 글.split(' #')[0]).join(', '), 'qa_player2');
      const 아이템 = await verify('아이템 값이 그대로 남는다', (await 화면.아이템이름값들()).join(', '), '체력 물약');
      const 제목값 = await verify('제목 값이 그대로 남는다', await 화면.제목칸.inputValue(), 제목);
      await verify('지급 사유를 비워 지급이 실패하면 받는 캐릭터 · 아이템 · 제목 값이 그대로 남는다', 고른 && 아이템 && 제목값, true);
    });
  } finally {
    await 내것지급치우기(page, 접두);
  }
});
