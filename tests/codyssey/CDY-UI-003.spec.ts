import { defineCase, test, verify } from '@platform/kit';

import { 회원가입팝업 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-003',
  name: '「지역을 선택해 주세요」 팝업에 「서울 개포 캠퍼스」 · 「대전 대전 캠퍼스」 · 「경남 경남 캠퍼스」 지역 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입팝업(page);

  await test.step('지역 선택 팝업을 연다', async () => {
    await 가입.지역팝업을연다();
    await 가입.지역팝업제목.waitFor();
    await 가입.지역팝업닫기버튼.waitFor();
    await verify('「지역을 선택해 주세요」 팝업 제목이 보인다', await 가입.지역팝업제목.isVisible(), true, { blocker: true });
    const 보임 = await Promise.all([가입.서울버튼, 가입.대전버튼, 가입.경남버튼].map((버튼) => 버튼.isVisible()));
    await verify(
      '「지역을 선택해 주세요」 팝업에 「서울 개포 캠퍼스」 · 「대전 대전 캠퍼스」 · 「경남 경남 캠퍼스」 지역 버튼이 보인다',
      보임.every(Boolean),
      true,
    );
    await verify('팝업 아래 「지역을 선택해 주세요」 버튼이 꺼져 있다', await 가입.지역선택버튼.isDisabled(), true);
    await verify(
      '「계정은 지역별로 분리되어 있어, 가입 후에는 다른 지역으로 옮길 수 없습니다.」 안내가 보인다',
      await 가입.지역안내문.isVisible(),
      true,
    );
  });
});
