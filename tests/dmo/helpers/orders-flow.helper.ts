import type { Page } from '@playwright/test';

import { 회원창 } from './account.helper.js';
import { 상품목록, 시험데이터만들기, type 운영상품, type 주문상태 } from './ops-data.helper.js';

const 모바일인가 = (page: Page): boolean => (page.viewportSize()?.width ?? 1280) < 768;

export async function 뒤쪽상품(page: Page, 칸: number): Promise<운영상품> {
  const 후보 = (await 상품목록(page, '')).filter((p) => p.stock >= 10).sort((a, b) => b.id - a.id);
  const 상품 = 후보[칸 * 2 + (모바일인가(page) ? 1 : 0)];
  if (!상품) throw new Error(`재고가 넉넉한 뒤쪽 상품이 ${칸 * 2 + 2}개 못 된다`);
  return 상품;
}

export async function 주문합계읽기(page: Page, 주문번호: string): Promise<number> {
  const res = await page.request.get(`/api/ops/orders/${encodeURIComponent(주문번호)}`);
  if (!res.ok()) throw new Error(`주문 상세 읽기 실패 ${res.status()} ${await res.text()}`);
  return ((await res.json()) as { total: number }).total;
}

export async function 주문하나(page: Page, loginId: string, 상태: 주문상태): Promise<string> {
  const { orderIds } = await 시험데이터만들기(page, loginId, { [상태]: 1 });
  const 주문번호 = orderIds[0];
  if (!주문번호) throw new Error(`${상태} 주문이 만들어지지 않았다`);
  return 주문번호;
}

export async function 상품재고읽기(page: Page, 상품명: string, 상품번호: number | undefined): Promise<number> {
  const 상품 = (await 상품목록(page, 상품명)).find((p) => (상품번호 === undefined ? p.name === 상품명 : p.id === 상품번호));
  if (!상품) throw new Error(`운영툴 상품 목록에 ${상품명} 이 없다`);
  return 상품.stock;
}

export async function 회원창열기(page: Page, loginId: string, password: string): Promise<Page> {
  const browser = page.context().browser();
  if (!browser) throw new Error('브라우저 연결이 없어 회원 창을 열 수 없다');
  return 회원창(browser, loginId, password);
}

export const 아직안고른상품: 운영상품 = { id: 0, name: '', category: '', price: 0, discountRate: 0, salePrice: 0, stock: 0 };

const 배송희망일 = (): string => {
  const 날 = new Date();
  날.setDate(날.getDate() + 3);
  if (날.getDay() === 0) 날.setDate(날.getDate() + 1);
  const 두자리 = (n: number): string => String(n).padStart(2, '0');
  return `${날.getFullYear()}-${두자리(날.getMonth() + 1)}-${두자리(날.getDate())}`;
};

export async function 상품주문하기(page: Page, loginId: string, password: string, 상품번호: number): Promise<string> {
  const 창 = await 회원창열기(page, loginId, password);
  try {
    const 상품 = await 창.request.get(`/api/products/${상품번호}`);
    if (!상품.ok()) throw new Error(`상품 읽기 실패 ${상품.status()} ${await 상품.text()}`);
    const { colors, sizes } = (await 상품.json()) as { colors?: string[]; sizes?: string[] };
    const res = await 창.request.post('/api/orders', {
      data: {
        shipping: { receiver: '일회용', phone: '01012345678', zipcode: '06236', address: '서울 강남구 테헤란로 1', detail: '101호', request: '', deliveryDate: 배송희망일() },
        payment: { method: '신용카드', cardCompany: '', installment: '일시불' },
        couponId: '',
        direct: { productId: 상품번호, color: colors?.[0] ?? '', size: sizes?.[0] ?? '', qty: 1 },
      },
    });
    if (res.status() !== 201) throw new Error(`주문 만들기 실패 ${res.status()} ${await res.text()}`);
    return ((await res.json()) as { id: string }).id;
  } finally {
    await 창.context().close();
  }
}
