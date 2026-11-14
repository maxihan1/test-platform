import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 아이템많은캐릭터찾기 } from './helpers/sanction.helper.js';
import type { 아이템많은캐릭터 } from './helpers/sanction.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-104',
  name: '「소지 아이템」 칸은 앞 4종이 「<이름> x<개수>」로 쉼표로 이어 보이고 4종이 넘으면 「외 N종」이 붙는다',
  precondition: ['아이템이 4종 넘게 든 캐릭터가 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  let 대상: 아이템많은캐릭터 | null = null;

  await test.step('운영자 계정으로 로그인하고 아이템이 4종 넘게 든 캐릭터를 찾는다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    대상 = await 아이템많은캐릭터찾기(page, 4);
  });

  await test.step('아이템이 4종 넘게 든 캐릭터가 있는지 확인한다', async () => {
    await verify('아이템이 4종 넘게 든 캐릭터가 있다', 대상 !== null, true, { blocker: true });
    await 화면.상세열기(대상?.계정 ?? 0);
    await verify('캐릭터 줄이 보인다', await 화면.캐릭터칸(대상?.캐릭터이름 ?? '', '이름').isVisible(), true, { blocker: true });
  });

  await test.step('그 캐릭터 줄의 「소지 아이템」 칸을 본다', async () => {
    const 아이템 = 대상?.아이템 ?? [];
    const 앞 = 아이템.slice(0, 4).map(([이름, 개수]) => `${이름} x${String(개수)}`).join(', ');
    const 기대 = 아이템.length > 4 ? `${앞} 외 ${String(아이템.length - 4)}종` : 앞;
    await verify('「소지 아이템」 칸은 앞 4종이 「<이름> x<개수>」로 쉼표로 이어 보이고 4종이 넘으면 「외 N종」이 붙는다', (await 화면.캐릭터칸(대상?.캐릭터이름 ?? '', '소지 아이템').innerText()).trim(), 기대);
  });
});
