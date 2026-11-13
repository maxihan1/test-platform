import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 기록화면 } from './pages/logs.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-233',
  name: '아이템 흐름 「종류」에 「전체」 · 「지급」 · 「수령」 · 「회수」가 있고 표 열은 「시각」 · 「흐름」 · 「캐릭터」 · 「아이템 · 재화」 · 「수량」 · 「재화」 · 「지급 번호」 · 「누가」다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 기록화면(page);

  await test.step('운영자 계정으로 로그인하고 「기록」의 「아이템 흐름」 탭을 연다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await 화면.열기();
    await 화면.탭누르기('아이템 흐름');
    await verify('「아이템 흐름」 탭이 선택돼 있다', await 화면.선택한탭('아이템 흐름').isVisible(), true, { blocker: true });
  });

  await test.step('「아이템 흐름」 탭의 「종류」 드롭다운과 표 머리를 본다', async () => {
    const 선택지 = await verify('아이템 흐름 「종류」에 「전체」 · 「지급」 · 「수령」 · 「회수」가 있다', (await 화면.종류선택지들.allInnerTexts()).join(', '), '전체, 지급, 수령, 회수');
    const 열 = await verify('표 열은 「시각」 · 「흐름」 · 「캐릭터」 · 「아이템 · 재화」 · 「수량」 · 「재화」 · 「지급 번호」 · 「누가」다', (await 화면.표머리들.allInnerTexts()).join(', '), '시각, 흐름, 캐릭터, 아이템 · 재화, 수량, 재화, 지급 번호, 누가');
    await verify('아이템 흐름 「종류」에 「전체」 · 「지급」 · 「수령」 · 「회수」가 있고 표 열은 「시각」 · 「흐름」 · 「캐릭터」 · 「아이템 · 재화」 · 「수량」 · 「재화」 · 「지급 번호」 · 「누가」다', 선택지 && 열, true);
  });
});
