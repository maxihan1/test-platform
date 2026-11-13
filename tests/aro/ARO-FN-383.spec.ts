import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유글, 고유접두, 내것지급치우기, 로그인돼있는가 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 지급화면 } from './pages/grants.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-383',
  name: '받는 캐릭터 없이 「보내기」를 누르면 확인 창에 「0명에게」가 보인다',
  techniques: ['경계값 분석'],
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 지급화면(page);
  const 접두 = 고유접두('ARO-FN-383');
  const 제목 = 고유글('ARO-FN-383');

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

    await test.step('받는 캐릭터 없이 아이템 · 제목 · 사유를 적고 「보내기」를 누른다', async () => {
      await 화면.폼채우기({ 아이템: [{ 이름: '체력 물약', 수량: 1 }], 제목, 사유: 제목 });
      await 화면.보내기눌러확인창뜰때까지();
      await verify('받는 캐릭터 없이 「보내기」를 누르면 확인 창에 「0명에게」가 보인다', (await 화면.창.본문.innerText()).includes('0명에게'), true);
    });

    await test.step('확인 창에서 「보내기」를 누른다', async () => {
      await 화면.확인창에서보내기();
      const 떴다 = await 화면.알림.뜰때까지('받는 캐릭터를 1~50명 고르세요');
      await verify('0명 확인 창의 「보내기」 뒤 토스트 「받는 캐릭터를 1~50명 고르세요」가 뜬다', 떴다, true);
    });
  } finally {
    await 내것지급치우기(page, 접두);
  }
});
