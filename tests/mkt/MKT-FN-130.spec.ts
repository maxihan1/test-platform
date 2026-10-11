import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import type { Download } from '@playwright/test';
import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 화면로그인 } from './helpers/account.helper.js';
import { 공지빼고방해막기, 내려받은글첫줄, 오늘여덟자리 } from './helpers/member.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-130',
  name: '회원 관리 칸 제목을 누르면 오름차순 「▲」, 다시 누르면 내림차순 「▼」 로 정렬된다',
  platforms: ['desktop'],
  precondition: [
    '관리자로 로그인해 있다',
  ],
  held: '보류 — 관리자 계정이 없다',
  params: z.object({
    adminLoginId: z.string().describe('관리자 아이디'),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 관리자 = new 관리자화면(page);
  const 알림 = new 토스트(page);
  const 머리 = new 머리글(page);
  let 처음배너: { id: number; visible: boolean }[] = [];
  let 처음공지: boolean | undefined;
  let 파일: Download | undefined;

  try {
    await 공지빼고방해막기(page);

    await test.step('관리자로 로그인한다', async () => {
      await 화면로그인(page, params.adminLoginId, params.adminPassword ?? '');
      await 머리.관리자링크.waitFor();
      await verify('머리글에 「관리자」 링크가 보인다', await 머리.관리자링크.isVisible(), true, { blocker: true });
      const 배너 = (await (await page.request.get('/api/admin/banners')).json()) as { items: { id: number; visible: boolean }[] };
      처음배너 = 배너.items.map((칸) => ({ id: 칸.id, visible: 칸.visible }));
      const 설정 = (await (await page.request.get('/api/settings')).json()) as { noticePopup: boolean };
      처음공지 = 설정.noticePopup;
    });

    await test.step('회원 관리 「아이디」 칸 제목을 두 번 누른다', async () => {
      await 관리자.열기();
      await 관리자.탭('회원 관리').click();
      await 관리자.회원줄들.first().waitFor();
      await 관리자.회원열머리('아이디').click();
      const 오름 = await 관리자.회원열머리('아이디').innerText();
      await 관리자.회원열머리('아이디').click();
      const 내림 = await 관리자.회원열머리('아이디').innerText();
      await verify('회원 관리 칸 제목을 누르면 오름차순 「▲」, 다시 누르면 내림차순 「▼」 로 정렬된다', { 오름, 내림 }, { 오름: '아이디 ▲', 내림: '아이디 ▼' });
    });

    await test.step('회원 관리 표를 아래로 굴린다', async () => {
      await 관리자.회원표.hover();
      await page.mouse.wheel(0, 3000);
      await page.waitForTimeout(300);
      const 표 = await 관리자.회원표.evaluate((칸) => ({ 높이: 칸.clientHeight, 굴러감: 칸.scrollTop > 0 }));
      await verify('회원이 1,000명 이상이어도 높이 600px 표 안에서 굴려 볼 수 있다', 표, { 높이: 600, 굴러감: true });
    });

    await test.step('회원 관리 「아이디 검색」 칸에 아이디를 적는다', async () => {
      await 관리자.아이디검색칸.fill(params.adminLoginId);
      await 관리자.회원줄들.filter({ hasNotText: params.adminLoginId }).first().waitFor({ state: 'detached' });
      const 줄들 = await 관리자.회원줄들.allInnerTexts();
      await verify(
        '「아이디 검색」 칸에 아이디를 적으면 그 아이디가 든 회원만 보인다',
        { 한건이상: 줄들.length > 0, 모두포함: 줄들.every((글) => 글.includes(params.adminLoginId)) },
        { 한건이상: true, 모두포함: true },
      );
    });

    await test.step('배너 관리에서 첫 배너를 끌어 맨 아래에 놓는다', async () => {
      await 관리자.탭('배너 관리').click();
      const 처음순서 = await 관리자.배너제목들();
      await 관리자.배너줄들.first().dragTo(관리자.배너줄들.last());
      await 관리자.첫배너제목.filter({ hasNotText: 처음순서[0] ?? '' }).waitFor();
      await verify('배너를 끌어다 놓으면 배너 순서가 바뀐다', await 관리자.배너제목들(), [...처음순서.slice(1), 처음순서[0]]);
    });

    await test.step('배너 관리에서 한 배너의 「노출」 스위치를 끈다', async () => {
      const 제목 = (await 관리자.배너제목들())[0] ?? '';
      const 스위치 = 관리자.배너노출스위치(관리자.배너(제목));
      await 스위치.uncheck();
      await verify('「노출」 스위치를 끄면 그 배너가 꺼짐으로 보인다', await 스위치.isChecked(), false);
    });

    await test.step('배너 관리에서 「저장」 을 누르고 홈 화면을 연다', async () => {
      const 노출제목 = await 관리자.노출켜진배너제목들();
      await 관리자.배너저장버튼.click();
      await 알림.글('저장되었습니다').waitFor();
      await page.goto('/');
      await 관리자.홈배너슬라이드들.first().waitFor();
      await verify('배너 관리에서 저장하면 홈 배너에 바로 그 순서와 노출이 보인다', await 관리자.홈배너제목들(), 노출제목);
    });

    await test.step('「홈 공지 팝업」 스위치를 끈다', async () => {
      await 관리자.열기();
      await 관리자.홈공지팝업스위치.uncheck();
      await 알림.모두.first().waitFor();
      const 저장알림 = await 알림.모두.first().innerText();
      await page.goto('/');
      await 관리자.홈배너슬라이드들.first().waitFor();
      await verify('「홈 공지 팝업」 스위치를 끄면 홈 화면에 공지 팝업이 뜨지 않는다', await 관리자.홈공지팝업.isVisible(), false);
      await verify('「홈 공지 팝업」 스위치를 바꾸면 토스트 「저장되었습니다」 가 보인다', 저장알림, '저장되었습니다');
    });

    await test.step('「주문 내역 내려받기」 를 누른다', async () => {
      await 관리자.열기();
      const 내려받기 = page.waitForEvent('download');
      await 관리자.주문내역내려받기.click();
      파일 = await 내려받기;
      await verify('「주문 내역 내려받기」 를 누르면 orders-{오늘 날짜 8자리}.csv 파일이 내려받아진다', 파일.suggestedFilename(), `orders-${오늘여덟자리()}.csv`);
    });

    await test.step('내려받은 주문 CSV 첫 줄을 읽는다', async () => {
      if (파일 === undefined) throw new Error('주문 CSV 가 내려받아지지 않았다');
      await verify('주문 CSV 첫 줄은 「주문번호,주문일,아이디,결제금액,상태」 다', await 내려받은글첫줄(파일), '주문번호,주문일,아이디,결제금액,상태');
    });
  } finally {
    if (처음배너.length > 0) await page.request.put('/api/admin/banners', { data: { items: 처음배너 } });
    if (처음공지 !== undefined) await page.request.put('/api/admin/settings', { data: { noticePopup: 처음공지 } });
  }
});
