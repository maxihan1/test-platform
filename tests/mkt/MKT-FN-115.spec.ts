import { defineCase, test, verify } from '@platform/kit';
import { 새회원만들기, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 비밀번호찾기화면 } from './pages/find-password.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-115',
  name: '아이디와 이메일이 일치하면 「가입하신 이메일로 임시 비밀번호를 보냈습니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 찾기 = new 비밀번호찾기화면(page);
  const 준비: { 회원?: 회원정보 } = {};

  try {
    await test.step('새 회원을 가입시키고 비밀번호 찾기 화면을 연다', async () => {
      준비.회원 = await 새회원만들기(request);
      await 방해창막기(page);
      await 찾기.열기();
    });

    await test.step('가입한 회원과 비밀번호 찾기 화면이 준비됐는지 확인한다', async () => {
      await verify('비밀번호 찾기 화면 제목 「비밀번호 찾기」가 보인다', await 찾기.제목.isVisible(), true, { blocker: true });
    });

    await test.step('그 회원의 아이디와 이메일을 적고 「임시 비밀번호 받기」를 누른다', async () => {
      await 찾기.채우기(준비.회원?.loginId ?? '', 준비.회원?.email ?? '');
      await 찾기.받기누르기();
      await verify('아이디와 이메일이 일치하면 「가입하신 이메일로 임시 비밀번호를 보냈습니다」가 보인다', await 찾기.결과.innerText(), '가입하신 이메일로 임시 비밀번호를 보냈습니다');
    });
  } finally {
    if (준비.회원) await 회원정리(request, 준비.회원);
  }
});
