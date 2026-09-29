import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-032',
  name: '로그인 화면에서 「다른 지역이신가요?」를 누르면 서울·대전·경남 캠퍼스의 로그인 화면 링크가 나온다',
  precondition: ['비회원이다'],
  params: null,
  expected: z.object({
    campuses: z.string().describe('나올 캠퍼스 이름을 쉼표로 이은 것').default('서울 개포 캠퍼스, 대전 대전 캠퍼스, 경남 경남 캠퍼스'),
    hrefs: z.string().describe('캠퍼스 링크 주소를 쉼표로 이은 것').default('/loginForm, /daejeon/loginForm, /gyeongnam/loginForm'),
  }),
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page, expected }) => {
  await test.step('로그인 화면을 연다', async () => {
    await page.goto('/loginForm');
    await page.getByRole('button', { name: '다른 지역이신가요?' }).waitFor();
  });

  await test.step('「다른 지역이신가요?」를 누른다', async () => {
    await page.getByRole('button', { name: '다른 지역이신가요?' }).click();
    const 링크 = page.getByRole('link', { name: /캠퍼스$/ });
    await 링크.last().waitFor();
    const 이름들 = (await 링크.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
    const 주소들 = await 링크.evaluateAll((a) => a.map((x) => x.getAttribute('href') ?? ''));
    await verify(
      '로그인 화면에서 「다른 지역이신가요?」를 누르면 서울·대전·경남 캠퍼스의 로그인 화면 링크가 나온다',
      { campuses: 이름들.join(', '), hrefs: 주소들.join(', ') },
      { campuses: expected.campuses, hrefs: expected.hrefs },
    );
  });
});
