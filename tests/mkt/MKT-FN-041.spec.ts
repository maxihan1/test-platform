import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 비밀번호찾기화면 } from './pages/find-password.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-041',
  name: '아이디와 이메일을 비우고 「임시 비밀번호 받기」 를 누르면 깨지지 않고 안내 문구가 보인다',
  platforms: ['desktop'],
  precondition: [
    '비회원이다',
  ],
  techniques: ['오류 추정'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 찾기 = new 비밀번호찾기화면(page);
  const 머리 = new 머리글(page);

  await 방해막기(page);

  await test.step('비밀번호 찾기 화면에서 아이디와 이메일을 비우고 「임시 비밀번호 받기」 를 누른다', async () => {
    await 찾기.열기();
    await 머리.로그인링크.waitFor();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await 찾기.누르고결과기다리기();
    await verify(
      '아이디와 이메일을 비우고 「임시 비밀번호 받기」 를 누르면 깨지지 않고 안내 문구가 보인다',
      { 제목보임: await 찾기.제목.isVisible(), 안내: await 찾기.결과문구.innerText() },
      { 제목보임: true, 안내: '일치하는 회원 정보가 없습니다' },
    );
  });
});
