import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 계정번호, 캐릭터번호 } from './helpers/ops-api.helper.js';
import { 로그인돼있는가 } from './helpers/grant.helper.js';
import { 지급화면 } from './pages/grants.page.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-097',
  name: '상세 패널 캐릭터 줄의 「지급」을 누르면 /grants?to=3 으로 가고 받는 캐릭터에 qa_player2 가 골라져 있다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 유저 = new 유저화면(page);
  const 지급 = new 지급화면(page);
  let 캐릭터 = 0;

  await test.step('운영자 계정으로 로그인하고 qa_player2 상세 패널을 연다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    const 계정 = await 계정번호(page, 'qa_player2');
    캐릭터 = await 캐릭터번호(page, 'qa_player2');
    await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
    await 유저.상세열기(계정);
    await verify('qa_player2 상세 패널에 캐릭터 줄의 「지급」 링크가 보인다', await 유저.캐릭터지급링크('qa_player2').isVisible(), true, { blocker: true });
  });

  await test.step('qa_player2 상세 패널에서 캐릭터 줄의 「지급」을 누른다', async () => {
    await 유저.캐릭터지급링크('qa_player2').click();
    await 지급.그려질때까지();
    const 주소 = await verify('/grants?to=3 으로 간다', 지급.현재주소(), `/grants?to=${String(캐릭터)}`);
    const 고른 = await verify('받는 캐릭터에 qa_player2 가 골라져 있다', (await 지급.고른것들.allInnerTexts()).join(', '), `qa_player2 #${String(캐릭터)} ×`);
    await verify('상세 패널 캐릭터 줄의 「지급」을 누르면 /grants?to=3 으로 가고 받는 캐릭터에 qa_player2 가 골라져 있다', 주소 && 고른, true);
  });
});
