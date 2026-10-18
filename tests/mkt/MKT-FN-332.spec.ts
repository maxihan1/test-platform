import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 기본회원으로로그인, 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 회원정보수정화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-332',
  name: '2MB 프로필 사진을 올리면 미리보기가 그 사진으로 바뀐다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
    한도크기: z.number().int().describe('올릴 사진 크기(바이트) — 2MB 이하').default(2 * 1024 * 1024),
    초과크기: z.number().int().describe('올릴 사진 크기(바이트) — 2MB 초과').default(2 * 1024 * 1024 + 1),
  }),
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page, params }) => {
  const 수정 = new 회원정보수정화면(page);
  let 기본주소 = '';

  await test.step('회원으로 로그인한다', async () => {
    await 방해창막기(page);
    await 기본회원으로로그인(page.request, params.loginId ?? '', params.loginPassword ?? '');
  });

  await test.step('로그인한 상태를 확인한다', async () => {
    await verify('세션에 회원이 있다', await 세션회원있는가(page.request), true, { blocker: true });
  });

  await test.step('회원정보 수정 화면에서 비밀번호를 다시 입력한다', async () => {
    await 수정.열기();
    await 수정.비밀번호확인하기(params.loginPassword ?? '');
    기본주소 = await 수정.미리보기주소();
  });

  await test.step('회원정보 수정 화면이 열렸는지 확인한다', async () => {
    await verify('프로필 사진 칸이 보인다', await 수정.사진칸.count(), 1, { blocker: true });
  });

  await test.step('프로필 사진에 2MB png 를 올린다', async () => {
    await 수정.사진올리기(params.한도크기);
    await 수정.미리보기바뀔때까지(기본주소);
    const 올린뒤 = await 수정.미리보기주소();
    const 머리 = 'data:image/png;base64,';
    await verify(
      '2MB 프로필 사진을 올리면 미리보기가 그 사진으로 바뀐다',
      올린뒤.length,
      머리.length + Math.ceil(params.한도크기 / 3) * 4,
    );
  });

  await test.step('프로필 사진에 2MB 를 조금 넘는 png 를 올린다', async () => {
    const 앞 = await 수정.미리보기주소();
    await 수정.사진올리기(params.초과크기);
    await 수정.사진오류.first().waitFor();
    await verify('2MB 를 넘는 프로필 사진은 미리보기가 바뀌지 않는다', (await 수정.미리보기주소()) === 앞, true);
  });
});
