import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { PNG만들기 } from './helpers/member.helper.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-115',
  name: '2MB 를 넘는 사진을 올리면 「2MB 이하 파일만 올릴 수 있습니다」 가 보인다',
  platforms: ['desktop'],
  precondition: [
    '회원정보 수정 화면에서 비밀번호 재확인을 마쳤다',
  ],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 수정 = new 회원정보수정화면(page);
  const 머리 = new 머리글(page);
  const 두메가 = 2 * 1024 * 1024;

  await 방해막기(page);

  await test.step('회원정보 수정 화면에서 비밀번호 재확인을 마친다', async () => {
    await 화면로그인(page, params.loginId ?? '', params.password ?? '');
    await 머리.로그아웃버튼.waitFor();
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
    await 수정.열기();
    await 수정.비밀번호확인하기(params.password ?? '');
    await verify('회원정보 수정 화면에 「저장」 버튼이 보인다', await 수정.저장버튼.isVisible(), true, { blocker: true });
  });

  await test.step('2MB 를 넘는 png 사진을 프로필 사진으로 올린다', async () => {
    await 수정.사진올리기({ name: 'size-over-2mb.png', mimeType: 'image/png', buffer: PNG만들기(두메가 + 1) });
    await 수정.사진오류.waitFor();
    await verify('2MB 를 넘는 사진을 올리면 「2MB 이하 파일만 올릴 수 있습니다」 가 보인다', await 수정.사진오류.innerText(), '2MB 이하 파일만 올릴 수 있습니다');
  });

  await test.step('2MB png 사진을 프로필 사진으로 올린다', async () => {
    await 수정.사진올리기({ name: 'size-2mb.png', mimeType: 'image/png', buffer: PNG만들기(두메가) });
    await 수정.올린사진미리보기.waitFor();
    await verify('2MB 사진을 올리면 「2MB 이하 파일만 올릴 수 있습니다」 가 보이지 않는다', await 수정.사진오류.isVisible(), false);
  });
});
