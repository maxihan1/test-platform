import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 기록화면 } from './pages/logs.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-214',
  name: '「기록」 화면에 탭 「운영자 작업」 · 「아이템 흐름」 · 「종류」 드롭다운 · 「검색」 칸 · 「총 N건」이 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 기록화면(page);

  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
  });

  await test.step('「기록」 화면을 연다', async () => {
    await 화면.열기();
    await verify('「기록」 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    const 작업탭 = await verify('「운영자 작업」 탭이 보인다', await 화면.탭('운영자 작업').isVisible(), true);
    const 흐름탭 = await verify('「아이템 흐름」 탭이 보인다', await 화면.탭('아이템 흐름').isVisible(), true);
    const 종류 = await verify('「종류」 드롭다운이 보인다', await 화면.종류.isVisible(), true);
    const 검색 = await verify('「검색」 칸이 보인다', await 화면.검색칸.isVisible(), true);
    const 총건수 = await verify('「총 N건」이 보인다', await 화면.총건수.isVisible(), true);
    await verify('「기록」 화면에 탭 「운영자 작업」 · 「아이템 흐름」 · 「종류」 드롭다운 · 「검색」 칸 · 「총 N건」이 보인다', 작업탭 && 흐름탭 && 종류 && 검색 && 총건수, true);
  });

  await test.step('표 아래 안내를 본다', async () => {
    const 안내 = await verify('안내 「최근 것부터. 아이템 흐름은 운영툴이 보낸 우편의 지급 · 게임에서 받은 것 · 회수한 것입니다.」가 보인다', await 화면.안내.isVisible(), true);
    const 버튼없음 = await verify('수정 · 삭제 버튼이 없다', await 화면.수정삭제버튼.count(), 0);
    await verify('안내 「최근 것부터. 아이템 흐름은 운영툴이 보낸 우편의 지급 · 게임에서 받은 것 · 회수한 것입니다.」가 보이고 수정 · 삭제 버튼은 없다', 안내 && 버튼없음, true);
  });
});
