import type { Download, Locator, Page } from '@playwright/test';

export interface 배너줄값 {
  제목: string;
  노출: boolean;
}

export interface 회원목록측정 {
  높이: number;
  넘침: boolean;
  합계문구: boolean;
  합계위: boolean;
}

export class 관리자화면 {
  readonly 권한없음제목: Locator;
  readonly 회원표영역: Locator;
  readonly 회원표: Locator;
  readonly 합계: Locator;
  readonly 아이디검색칸: Locator;
  readonly 회원줄들: Locator;
  readonly 배너목록: Locator;
  readonly 배너줄들: Locator;
  readonly 배너저장버튼: Locator;
  readonly 공지팝업스위치: Locator;
  readonly 내려받기링크: Locator;

  constructor(private readonly page: Page) {
    this.권한없음제목 = page.getByRole('heading', { name: '권한이 없습니다', level: 1 });
    this.회원표영역 = page.locator('#user-scroll');
    this.회원표 = this.회원표영역.getByRole('table');
    this.합계 = page.locator('#user-total');
    this.아이디검색칸 = page.getByLabel('아이디 검색');
    this.회원줄들 = this.회원표.getByRole('row').filter({ has: page.getByRole('cell') });
    this.배너목록 = page.locator('#banner-list');
    this.배너줄들 = this.배너목록.getByRole('listitem');
    this.배너저장버튼 = page.locator('#banner-save');
    this.공지팝업스위치 = page.getByLabel('홈 공지 팝업');
    this.내려받기링크 = page.getByRole('link', { name: '주문 내역 내려받기' });
  }

  칸제목(이름: string): Locator {
    return this.회원표.getByRole('columnheader').filter({ hasText: 이름 });
  }

  회원줄(아이디: string): Locator {
    return this.회원줄들.filter({ hasText: 아이디 });
  }

  잠금해제버튼(줄: Locator): Locator {
    return 줄.getByRole('button', { name: '잠금 해제', exact: true });
  }

  배너노출스위치(번째: number): Locator {
    return this.배너줄들.nth(번째 - 1).getByRole('switch');
  }

  async 열기(): Promise<void> {
    await this.page.goto('/admin');
  }

  async 패널열기(안의것: Locator): Promise<void> {
    await 안의것.waitFor({ state: 'attached' });
    if (await 안의것.isVisible()) return;
    const 패널번호 = await 안의것.evaluate((el) => {
      const 탭들 = [...document.querySelectorAll('[role=tab]')];
      const 번호들 = new Set(탭들.map((t) => t.getAttribute('aria-controls')));
      let 위: Element | null = el;
      while (위) {
        if (위.id && 번호들.has(위.id)) return 위.id;
        위 = 위.parentElement;
      }
      return '';
    });
    if (패널번호) await this.page.locator(`[role=tab][aria-controls="${패널번호}"]`).click();
  }

  async 회원관리열기(): Promise<void> {
    await this.열기();
    await this.패널열기(this.회원표영역);
    await this.회원줄들.first().waitFor();
  }

  async 배너관리열기(): Promise<void> {
    await this.열기();
    await this.패널열기(this.배너목록);
    await this.배너줄들.first().waitFor();
  }

  async 배너줄읽기(): Promise<배너줄값[]> {
    const 개수 = await this.배너줄들.count();
    const 값들: 배너줄값[] = [];
    for (let i = 0; i < 개수; i += 1) {
      const 줄 = this.배너줄들.nth(i);
      const 제목 = (await 줄.locator('.title').innerText()).trim();
      const 노출 = await 줄.getByRole('switch').isChecked();
      값들.push({ 제목, 노출 });
    }
    return 값들;
  }

  async 첫배너를맨아래로끌기(): Promise<void> {
    const 개수 = await this.배너줄들.count();
    await this.배너줄들.first().dragTo(this.배너줄들.nth(개수 - 1));
  }

  async 보이는아이디들(): Promise<string[]> {
    const 줄들 = await this.회원줄들.allInnerTexts();
    return 줄들.map((줄) => (줄.split('\t')[0] ?? '').trim());
  }

  async 회원목록측정(): Promise<회원목록측정> {
    const 영역 = await this.회원표영역.boundingBox();
    const 합계상자 = await this.합계.boundingBox();
    const 넘침 = await this.회원표영역.evaluate((el) => el.scrollHeight > el.clientHeight);
    const 합계글 = (await this.합계.innerText()).trim();
    return {
      높이: Math.round(영역?.height ?? 0),
      넘침,
      합계문구: /^총 \d+명$/.test(합계글),
      합계위: 영역 !== null && 합계상자 !== null && 합계상자.y < 영역.y,
    };
  }

  async 주문내역내려받기(): Promise<Download> {
    const [내려받기] = await Promise.all([this.page.waitForEvent('download'), this.내려받기링크.click()]);
    return 내려받기;
  }
}
