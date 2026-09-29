import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-004',
  name: '머리글 메뉴 넷에 마우스를 올리면 메뉴마다 하위 메뉴가 보인다',
  precondition: ['비회원으로 홈에 들어와 있다'],
  params: null,
  expected: z.object({
    aboutSubMenus: z.string().describe('「코디세이란」 하위 메뉴 이름을 쉼표로 이은 것').default('코디세이 세계관, 코디세이 소개, 캠퍼스 안내'),
    courseSubMenus: z.string().describe('「과정소개」 하위 메뉴 이름을 쉼표로 이은 것').default('교육과정, 교육 콘텐츠 알아보기, 교육 콘텐츠 체험, 연간 교육일정, 지원혜택'),
    guideSubMenus: z.string().describe('「모집안내」 하위 메뉴 이름을 쉼표로 이은 것').default('AI 올인원, AI 네이티브'),
    boardSubMenus: z.string().describe('「알림마당」 하위 메뉴 이름을 쉼표로 이은 것').default('공지사항, 코디세이 사람들, FAQ'),
  }),
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page, expected }) => {
  const 머리 = page.getByRole('banner');

  const 보이는하위 = async (이름들: string) => {
    const 나온것: string[] = [];
    for (const 이름 of 이름들.split(', ')) {
      if (await 머리.getByRole('link', { name: 이름, exact: true }).first().isVisible()) 나온것.push(이름);
    }
    return 나온것.join(', ');
  };

  await test.step('홈을 열고 공지 팝업을 닫는다', async () => {
    await page.goto('/');
    const 팝업 = page.getByRole('dialog');
    await 팝업.first().waitFor();
    while ((await 팝업.count()) > 0) {
      await 팝업.getByRole('button', { name: '닫기' }).first().click();
    }
    await 머리.getByRole('link', { name: '로그인', exact: true }).waitFor();
  });

  await test.step('머리글 메뉴 「코디세이란」에 마우스를 올린다', async () => {
    await 머리.getByRole('link', { name: '코디세이란', exact: true }).hover();
    await 머리.getByRole('link', { name: '캠퍼스 안내', exact: true }).waitFor();
    await verify(
      '「코디세이란」의 하위 메뉴 「코디세이 세계관」·「코디세이 소개」·「캠퍼스 안내」가 보인다',
      await 보이는하위(expected.aboutSubMenus),
      expected.aboutSubMenus,
    );
  });

  await test.step('머리글 메뉴 「과정소개」에 마우스를 올린다', async () => {
    await 머리.getByRole('link', { name: '과정소개', exact: true }).hover();
    await 머리.getByRole('link', { name: '연간 교육일정', exact: true }).waitFor();
    await verify(
      '「과정소개」의 하위 메뉴 「교육과정」·「교육 콘텐츠 알아보기」·「교육 콘텐츠 체험」·「연간 교육일정」·「지원혜택」이 보인다',
      await 보이는하위(expected.courseSubMenus),
      expected.courseSubMenus,
    );
  });

  await test.step('머리글 메뉴 「모집안내」에 마우스를 올린다', async () => {
    await 머리.getByRole('link', { name: '모집안내', exact: true }).hover();
    await 머리.getByRole('link', { name: 'AI 네이티브', exact: true }).waitFor();
    await verify(
      '「모집안내」의 하위 메뉴 「AI 올인원」·「AI 네이티브」가 보인다',
      await 보이는하위(expected.guideSubMenus),
      expected.guideSubMenus,
    );
  });

  await test.step('머리글 메뉴 「알림마당」에 마우스를 올린다', async () => {
    await 머리.getByRole('link', { name: '알림마당', exact: true }).hover();
    await 머리.getByRole('link', { name: '코디세이 사람들', exact: true }).waitFor();
    await verify(
      '「알림마당」의 하위 메뉴 「공지사항」·「코디세이 사람들」·「FAQ」가 보인다',
      await 보이는하위(expected.boardSubMenus),
      expected.boardSubMenus,
    );
  });
});
