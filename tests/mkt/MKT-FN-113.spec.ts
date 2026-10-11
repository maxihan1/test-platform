import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { PNG만들기 } from './helpers/member.helper.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-113',
  name: '비밀번호를 다시 넣고 「비밀번호 확인」 을 누르면 이름 · 이메일 · 휴대폰 · 관심 분야를 고칠 수 있다',
  platforms: ['desktop'],
  precondition: [
    '회원으로 로그인해 있다',
  ],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 수정 = new 회원정보수정화면(page);
  const 머리 = new 머리글(page);

  await 방해막기(page);

  await test.step('회원으로 로그인한다', async () => {
    await 화면로그인(page, params.loginId ?? '', params.password ?? '');
    await 머리.로그아웃버튼.waitFor();
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
  });

  await test.step('회원정보 수정 화면에서 비밀번호를 다시 넣고 「비밀번호 확인」 을 누른다', async () => {
    await 수정.열기();
    await 수정.비밀번호확인하기(params.password ?? '');
    await verify(
      '비밀번호를 다시 넣고 「비밀번호 확인」 을 누르면 이름 · 이메일 · 휴대폰 · 관심 분야를 고칠 수 있다',
      {
        이름: await 수정.이름칸.isEditable(),
        이메일: await 수정.이메일칸.isEditable(),
        휴대폰: await 수정.휴대폰칸.isEditable(),
        관심분야: (await Promise.all(['패션', '전자기기', '도서', '식품'].map((이름) => 수정.관심체크(이름).isEnabled()))).every(Boolean),
      },
      { 이름: true, 이메일: true, 휴대폰: true, 관심분야: true },
    );
    await verify('비밀번호 재확인 뒤 아이디 칸은 고칠 수 없게 흐리게 보인다', await 수정.아이디칸.isDisabled(), true);
  });

  await test.step('프로필 사진을 올린 뒤 「기본 이미지로」 를 누른다', async () => {
    const 처음 = await 수정.미리보기주소();
    await 수정.사진올리기({ name: 'profile.png', mimeType: 'image/png', buffer: PNG만들기() });
    await 수정.올린사진미리보기.waitFor();
    await verify('프로필 사진을 올리면 미리보기가 올린 사진으로 바뀐다', (await 수정.미리보기주소()) !== 처음, true, { blocker: true });
    await 수정.기본이미지로버튼.click();
    await verify('프로필 사진을 올린 뒤 「기본 이미지로」 를 누르면 미리보기가 기본 사진으로 돌아간다', await 수정.미리보기주소(), 처음);
  });
});
