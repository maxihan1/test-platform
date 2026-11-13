import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-056',
  name: '「유저 · 제재」 화면에 라벨 「검색」과 안내 글 「아이디 · 이메일 · 계정 번호 · 캐릭터 이름」의 검색 칸이 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);

  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
  });

  await test.step('「유저 · 제재」 화면을 연다', async () => {
    await 화면.열기();
    await verify('「유저 · 제재」 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    const 라벨칸 = await verify('라벨 「검색」의 검색 칸이 보인다', await 화면.검색칸.isVisible(), true);
    const 안내칸 = await verify('안내 글 「아이디 · 이메일 · 계정 번호 · 캐릭터 이름」의 검색 칸이 보인다', await 화면.안내검색칸.isVisible(), true);
    await verify('「유저 · 제재」 화면에 라벨 「검색」과 안내 글 「아이디 · 이메일 · 계정 번호 · 캐릭터 이름」의 검색 칸이 보인다', 라벨칸 && 안내칸, true);
  });

  await test.step('표 위 합계를 본다', async () => {
    const 합계 = await 화면.총인원.boundingBox();
    const 표 = await 화면.표영역.boundingBox();
    const 보임 = await verify('「총 N명」이 보인다', await 화면.총인원.isVisible(), true);
    const 위 = await verify('「총 N명」이 표보다 위에 있다', 합계 !== null && 표 !== null && 합계.y + 합계.height <= 표.y, true);
    const 오른쪽 = await verify('「총 N명」이 표의 가운데보다 오른쪽에 있다', 합계 !== null && 표 !== null && 합계.x + 합계.width / 2 > 표.x + 표.width / 2, true);
    await verify('표 위 오른쪽에 「총 N명」이 보인다', 보임 && 위 && 오른쪽, true);
  });

  await test.step('표 머리를 본다', async () => {
    await verify('유저 표에 열 「번호」 · 「아이디」 · 「이메일」 · 「캐릭터」 · 「상태」가 보인다', await 화면.열이름(화면.유저표), '번호, 아이디, 이메일, 캐릭터, 상태');
  });
});
