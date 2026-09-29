import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-001',
  name: '첫 방문 홈에 공지 팝업이 뜨고 모든 팝업에 「닫기」 버튼과 「오늘 하루 다시보지 않기」 체크박스가 있다',
  precondition: ['이 브라우저로 처음 방문한다'],
  params: null,
  expected: z.object({
    popupShown: z.boolean().describe('공지 팝업이 뜰지 여부').default(true),
    allHaveClose: z.boolean().describe('모든 팝업에 「닫기」 버튼이 있을지 여부').default(true),
    allHaveCheckbox: z.boolean().describe('모든 팝업에 「오늘 하루 다시보지 않기」 체크박스가 있을지 여부').default(true),
  }),
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page, expected }) => {
  await test.step('홈을 연다', async () => {
    await page.goto('/');
    const 팝업 = page.getByRole('dialog');
    await 팝업.first().waitFor();
    const 개수 = await 팝업.count();
    await verify(
      '첫 방문 홈에 공지 팝업이 뜨고 모든 팝업에 「닫기」 버튼과 「오늘 하루 다시보지 않기」 체크박스가 있다',
      {
        popupShown: 개수 > 0,
        allHaveClose: (await 팝업.getByRole('button', { name: '닫기' }).count()) === 개수,
        allHaveCheckbox: (await 팝업.getByRole('checkbox', { name: '오늘 하루 다시보지 않기' }).count()) === 개수,
      },
      { popupShown: expected.popupShown, allHaveClose: expected.allHaveClose, allHaveCheckbox: expected.allHaveCheckbox },
    );
  });
});
