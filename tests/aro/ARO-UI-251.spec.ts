import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시험계정 } from './helpers/sanction.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 계정번호 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-251',
  name: '저장 데이터가 빈 캐릭터는 번호 · 이름만 보이고 나머지 칸이 「-」로 보인다',
  precondition: ['계정 상세 응답은 저장 값이 빈 캐릭터를 주는 가짜 응답(모킹)이다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  const 캐릭터번호 = 70001;
  const 캐릭터이름 = '시험빈캐릭터';
  let 계정 = 0;
  const 주소 = (번호: number): string => `**/api/ops/users/${String(번호)}`;

  try {
    await test.step('운영자 계정으로 로그인하고 계정 상세 응답을 저장 값이 빈 캐릭터를 주는 가짜 응답으로 바꾼다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      계정 = await 계정번호(page, 시험계정);
      await page.context().route(주소(계정), async (route) => {
        await route.fulfill({
          status: 200,
          json: {
            id: 계정,
            userName: 시험계정,
            email: 'mock@example.invalid',
            suspended: false,
            chatMuted: false,
            characters: [
              { id: 캐릭터번호, accountId: 계정, name: 캐릭터이름, level: null, characterClass: null, race: null, scene: null, savedOn: null, currencies: null, items: null },
            ],
            sanctions: [],
          },
        });
      });
    });

    await test.step('그 계정의 상세 패널을 연다', async () => {
      await 화면.상세열기(계정);
      const 번호 = await verify('빈 캐릭터의 번호가 보인다', (await 화면.캐릭터칸(캐릭터이름, '번호').innerText()).trim(), String(캐릭터번호));
      const 이름 = await verify('빈 캐릭터의 이름이 보인다', (await 화면.캐릭터칸(캐릭터이름, '이름').innerText()).trim(), 캐릭터이름);
      const 나머지: string[] = [];
      for (const 열 of ['레벨', '직업', '종족', '위치', '재화', '소지 아이템', '마지막 저장'] as const) {
        나머지.push((await 화면.캐릭터칸(캐릭터이름, 열).innerText()).trim());
      }
      const 칸 = await verify('나머지 칸이 모두 「-」로 보인다', 나머지.join(', '), '-, -, -, -, -, -, -');
      await verify('저장 데이터가 빈 캐릭터는 번호 · 이름만 보이고 나머지 칸이 「-」로 보인다', 번호 && 이름 && 칸, true);
    });
  } finally {
    if (계정 > 0) await page.context().unroute(주소(계정));
  }
});
