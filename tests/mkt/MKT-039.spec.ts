import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-039',
  name: '관리자가 홈 공지 팝업 스위치를 끄면 홈에 공지 팝업이 뜨지 않는다',
  precondition: [
    '관리자 계정이 있다',
    '공지 팝업 설정 저장과 설정 조회 응답은 가짜 응답(모킹)이다 — 서버의 설정은 바뀌지 않는다',
  ],
  params: z.object({
    adminId: z.string().min(1).describe('관리자 아이디').optional(),
    adminPassword: z.string().min(1).describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    adminLinkVisible: z.boolean().describe('머리글에 「관리자」 링크가 보일지 여부').default(true),
    switchOnBefore: z.boolean().describe('끄기 전 「홈 공지 팝업」 스위치가 켜져 있을지 여부').default(true),
    switchOnAfter: z.boolean().describe('끈 뒤 「홈 공지 팝업」 스위치가 켜져 있을지 여부').default(false),
    popupCount: z.number().describe('스위치를 끈 뒤 홈에 뜰 공지 팝업 수').default(0),
  }),
});

test(spec, async ({ page, params, expected }) => {
  let 저장: boolean | null = null;
  await page.context().route('**/api/admin/settings', async (route) => {
    저장 = (route.request().postDataJSON() as { noticePopup: boolean }).noticePopup;
    await route.fulfill({ json: { noticePopup: 저장 } });
  });
  await page.context().route('**/api/settings', async (route) => {
    const 응답 = await route.fetch();
    const 설정 = (await 응답.json()) as Record<string, unknown>;
    await route.fulfill({ response: 응답, json: 저장 === null ? 설정 : { ...설정, noticePopup: 저장 } });
  });

  await test.step('관리자 계정으로 로그인한다', async () => {
    await page.goto('/login');
    await page.getByLabel('아이디').fill(params.adminId ?? '');
    await page.getByLabel('비밀번호').fill(params.adminPassword ?? '');
    await page.getByRole('button', { name: '로그인' }).click();
  });

  await test.step('관리자로 로그인했는지 머리글을 본다', async () => {
    const 머리글 = page.getByRole('banner');
    await 머리글.getByRole('button', { name: '알림' }).waitFor();
    await verify('머리글에 「관리자」 링크가 보인다', await 머리글.getByRole('link', { name: '관리자' }).isVisible(), expected.adminLinkVisible, { blocker: true });
  });

  await test.step('관리자 화면 설정에서 「홈 공지 팝업」 스위치를 끈다', async () => {
    await page.goto('/admin');
    await page.getByRole('tab', { name: '설정 · 내보내기' }).click();
    const 스위치 = page.getByRole('switch', { name: '홈 공지 팝업' });
    await 스위치.click({ trial: true });
    const 처음 = await 스위치.isChecked();
    await 스위치.click();
    await page.getByRole('status').filter({ hasText: '저장되었습니다' }).waitFor();
    await verify(
      '「홈 공지 팝업」 스위치가 켜져 있다가 꺼진다',
      { 처음, 나중: await 스위치.isChecked() },
      { 처음: expected.switchOnBefore, 나중: expected.switchOnAfter },
      { blocker: true },
    );
  });

  await test.step('홈을 연다', async () => {
    await page.goto('/');
    await page.getByRole('region', { name: '추천 상품' }).getByRole('link').first().waitFor();
    await verify('관리자가 홈 공지 팝업 스위치를 끄면 홈에 공지 팝업이 뜨지 않는다', await page.getByRole('dialog', { name: '공지사항' }).count(), expected.popupCount);
  });
});
