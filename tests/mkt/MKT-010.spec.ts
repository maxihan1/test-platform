import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-010',
  name: '홈 공지 팝업에 닫기와 오늘 하루 보지 않기가 있고 체크하고 닫으면 다시 뜨지 않는다',
  precondition: ['이 브라우저로 처음 방문한다', '공지 팝업이 떠 있다'],
  params: null,
  expected: z.object({
    closeExists: z.boolean().describe('팝업에 「닫기」 버튼이 있을지 여부').default(true),
    checkboxVisible: z.boolean().describe('「오늘 하루 보지 않기」 체크박스가 보일지 여부').default(true),
    popupCountAfter: z.number().describe('체크하고 닫은 뒤 새로 고쳤을 때 뜰 팝업 수').default(0),
  }),
});

test(spec, async ({ page, expected }) => {
  const 팝업 = page.getByRole('dialog');

  await test.step('홈을 연다', async () => {
    await page.goto('/');
    await 팝업.waitFor();
    await verify(
      '공지 팝업에 「닫기」 버튼과 「오늘 하루 보지 않기」 체크박스가 보인다',
      {
        닫기: (await 팝업.getByRole('button', { name: '닫기' }).count()) > 0,
        체크박스: await 팝업.getByRole('checkbox', { name: '오늘 하루 보지 않기' }).isVisible(),
      },
      { 닫기: expected.closeExists, 체크박스: expected.checkboxVisible },
    );
  });

  await test.step('「오늘 하루 보지 않기」를 체크하고 「닫기」를 누른 뒤 홈을 새로 고친다', async () => {
    await 팝업.getByRole('checkbox', { name: '오늘 하루 보지 않기' }).check();
    await 팝업.getByRole('button', { name: '닫기' }).last().click();
    await 팝업.waitFor({ state: 'detached' });
    await page.reload();
    await page.locator('.rec-row a').first().waitFor();
    await verify('공지 팝업이 보이지 않는다', await 팝업.count(), expected.popupCountAfter);
  });
});
