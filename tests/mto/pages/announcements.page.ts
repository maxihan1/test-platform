import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';

export class 공지사항화면 {
  static readonly 주소 = '/admin/announcements';

  readonly 제목: Locator;
  readonly 알림: 알림;
  readonly 새공지: Locator;
  readonly 모두필터: Locator;
  readonly 진행중필터: Locator;
  readonly 공지줄들: Locator;
  readonly 빈목록: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '공지사항', level: 1 });
    this.알림 = new 알림(page);
    this.새공지 = page.getByRole('link', { name: '새 공지사항' });
    this.모두필터 = page.getByRole('link', { name: '모두', exact: true });
    this.진행중필터 = page.getByRole('link', { name: /^진행 중 \(\d+\)$/ });
    this.공지줄들 = page.locator('.announcements-list__item');
    this.빈목록 = page.getByText('공지를 찾을 수 없습니다.');
  }

  async 열기(): Promise<void> {
    await this.page.goto(공지사항화면.주소);
    await this.제목.waitFor();
    await this.새공지.waitFor();
  }

  공지줄(글: string): Locator {
    return this.공지줄들.filter({ hasText: 글 });
  }

  게시취소(글: string): Locator {
    return this.공지줄(글).getByRole('link', { name: '게시 취소' });
  }

  게시(글: string): Locator {
    return this.공지줄(글).getByRole('link', { name: '게시', exact: true });
  }

  예약표시(글: string): Locator {
    return this.공지줄(글).getByText('에 예약됨');
  }

  삭제(글: string): Locator {
    return this.공지줄(글).getByRole('link', { name: '삭제' });
  }

  알리기(글: string): Locator {
    return this.공지줄(글).getByRole('link', { name: '사용자들에게 알리기' });
  }

  본문링크(글: string): Locator {
    return this.공지줄(글).locator('.announcements-list__item__title');
  }

  async 지우기(글: string): Promise<void> {
    await this.열기();
    while ((await this.공지줄(글).count()) > 0) {
      this.page.once('dialog', (창) => void 창.accept());
      await this.삭제(글).first().click();
      await this.알림.글('공지가 성공적으로 삭제되었습니다!').first().waitFor();
      await this.열기();
    }
  }
}
