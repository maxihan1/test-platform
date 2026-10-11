import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-082',
  name: '회원가입 화면에 생년월일 날짜 선택 칸이 보인다',
  platforms: ['desktop'],
  precondition: [
    '비회원이다',
  ],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입화면(page);
  const 머리 = new 머리글(page);

  await 방해막기(page);

  await test.step('비회원으로 회원가입 화면을 연다', async () => {
    await 가입.열기();
    await 머리.로그인링크.waitFor();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await verify(
      '회원가입 화면에 생년월일 날짜 선택 칸이 보인다',
      { 보임: await 가입.생년월일칸.isVisible(), 종류: await 가입.생년월일칸.getAttribute('type') },
      { 보임: true, 종류: 'date' },
    );
    await verify(
      '회원가입 화면 성별에 「선택 안 함」 · 「남성」 · 「여성」 라디오가 있고 「선택 안 함」 이 골라져 있다',
      {
        선택안함: await 가입.성별라디오('선택 안 함').isVisible(),
        남성: await 가입.성별라디오('남성').isVisible(),
        여성: await 가입.성별라디오('여성').isVisible(),
        선택안함골라짐: await 가입.성별라디오('선택 안 함').isChecked(),
      },
      { 선택안함: true, 남성: true, 여성: true, 선택안함골라짐: true },
    );
    await verify(
      '회원가입 화면 관심 분야에 「패션」 · 「전자기기」 · 「도서」 · 「식품」 체크박스가 보인다',
      {
        이름들: await 가입.관심분야이름들(),
        모두보임: (await Promise.all(['패션', '전자기기', '도서', '식품'].map((이름) => 가입.관심체크(이름).isVisible()))).every(Boolean),
      },
      { 이름들: ['패션', '전자기기', '도서', '식품'], 모두보임: true },
    );
    await verify(
      '회원가입 화면에 약관 「(필수) 이용약관 동의」 · 「(필수) 개인정보 수집 동의」 · 「(선택) 마케팅 수신 동의」 세 개가 보인다',
      {
        이용약관: await 가입.약관체크('(필수) 이용약관 동의').isVisible(),
        개인정보: await 가입.약관체크('(필수) 개인정보 수집 동의').isVisible(),
        마케팅: await 가입.약관체크('(선택) 마케팅 수신 동의').isVisible(),
      },
      { 이용약관: true, 개인정보: true, 마케팅: true },
    );
    await verify('회원가입 화면의 모든 입력칸에 이름표(label)가 이어져 있다', await 가입.이름표없는칸들(), []);
  });
});
