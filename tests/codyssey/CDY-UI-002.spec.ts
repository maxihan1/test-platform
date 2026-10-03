import { defineCase, test, verify } from '@platform/kit';

import { 회원가입팝업 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-002',
  name: '회원가입 팝업에 지역 버튼 셋과 지역별 계정 안내가 모두 보인다',
  platforms: ['desktop'],
  precondition: ['로그아웃 상태다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입팝업(page);

  await test.step('회원가입 지역 선택 팝업을 연다', async () => {
    await 가입.지역팝업열기();

    const 서울보임 = await 가입.지역버튼('서울')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('회원가입 팝업에 「서울」 지역 버튼이 보인다', 서울보임, true);

    const 대전보임 = await 가입.지역버튼('대전')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('회원가입 팝업에 「대전」 지역 버튼이 보인다', 대전보임, true);

    const 경남보임 = await 가입.지역버튼('경남')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('회원가입 팝업에 「경남」 지역 버튼이 보인다', 경남보임, true);

    const 안내보임 = await 가입.지역안내
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify(
      '회원가입 팝업에 「계정은 지역별로 분리되어 있어, 가입 후에는 다른 지역으로 옮길 수 없습니다.」 안내가 보인다',
      안내보임,
      true,
    );
  });
});
