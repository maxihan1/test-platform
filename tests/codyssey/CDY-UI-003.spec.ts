import { defineCase, test, verify } from '@platform/kit';
import { 로그인화면 } from './pages/login.page.js';
import { 회원가입창 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-003',
  name: '가입 창 첫 단계에 제목과 안내 문구, 지역 버튼, 꺼진 아래 버튼이 보인다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 로그인화면(page);
  const 가입창 = new 회원가입창(page);

  await test.step('로그인 화면을 연다', async () => {
    await 화면.연다();
  });

  await test.step('로그인 화면의 「회원가입」 버튼을 확인한다', async () => {
    await 화면.제목.waitFor();
    await verify('로그인 화면에 「회원가입」 버튼이 보인다', await 화면.회원가입버튼.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 화면에서 「회원가입」을 누른다', async () => {
    await 화면.회원가입을누른다();
    await 가입창.제목('지역을 선택해 주세요').waitFor();
    await verify('가입 창에 제목 「지역을 선택해 주세요」가 보인다', await 가입창.제목('지역을 선택해 주세요').isVisible(), true);
    await verify(
      '가입 창에 지역 버튼 「서울」 「대전」 「경남」이 보인다',
      (await 가입창.보이는지역버튼(['서울', '대전', '경남'])).join(', '),
      '서울, 대전, 경남',
    );
    await verify(
      '가입 창에 안내 「코디세이는 지역별로 과정과 계정이 따로 운영됩니다.」가 보인다',
      await 가입창.안내문구('코디세이는 지역별로 과정과 계정이 따로 운영됩니다.').isVisible(),
      true,
    );
    await verify('가입 창 아래 버튼 「지역을 선택해 주세요」는 꺼져 있다', await 가입창.버튼('지역을 선택해 주세요').isDisabled(), true);
  });
});
