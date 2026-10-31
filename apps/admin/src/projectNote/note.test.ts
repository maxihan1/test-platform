import { describe, expect, it } from 'vitest';

import { 노트겹치기, 노트상한, 늘있는문서, type 노트문서 } from './note.js';

const 문서 = (name: string, body = '내용'): 노트문서 => ({ name, summary: `${name} 설명`, body });
const 다섯 = 늘있는문서.map((이름) => 문서(이름));

describe('노트겹치기', () => {
  it('처음 판은 늘 있는 다섯이 다 있어야 선다', () => {
    expect(노트겹치기([], [문서('한눈에')])).toMatchObject({ ok: false, error: 'BAD_NOTE' });
    expect(노트겹치기([], 다섯)).toMatchObject({ ok: true });
  });

  it('바뀐 문서만 받아 앞 판에 이름으로 겹치고, 새 기능 문서는 뒤에 · 지난 기록은 맨 뒤에 달 차례로 선다', () => {
    const 앞 = [...다섯, 문서('쿠폰', '옛 글'), 문서('지난 기록 2026-09')];
    const r = 노트겹치기(앞, [문서('지난 기록 2026-08'), 문서('쿠폰', '새 글'), 문서('결제')], ['지난 기록 2026-09']);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.docs.map((d) => d.name)).toEqual([...늘있는문서, '쿠폰', '결제', '지난 기록 2026-08']);
    expect(r.docs.find((d) => d.name === '쿠폰')?.body).toBe('새 글');
  });

  it('바뀐 기능 문서가 제자리에 남는다', () => {
    const 앞 = [...다섯, 문서('쿠폰'), 문서('결제'), 문서('배송')];
    const r = 노트겹치기(앞, [문서('쿠폰', '새 글'), 문서('장바구니')]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.docs.map((d) => d.name)).toEqual([...늘있는문서, '쿠폰', '결제', '배송', '장바구니']);
    expect(r.docs[늘있는문서.length]?.body).toBe('새 글');
  });

  it('지울 이름도 앞뒤 빈칸을 떼고 보고, 앞 판에 없거나 같이 보낸 이름이면 BAD_NOTE 에 그 이름을 붙인다', () => {
    const 앞 = [...다섯, 문서('쿠폰')];
    const r = 노트겹치기(앞, [], [' 쿠폰 ']);
    expect(r.ok && r.docs.map((d) => d.name)).toEqual([...늘있는문서]);
    expect(노트겹치기(앞, [], ['결제'])).toEqual({ ok: false, error: 'BAD_NOTE', detail: '지울 수 없는 이름: 결제' });
    expect(노트겹치기(앞, [문서('쿠폰', '새 글')], ['쿠폰'])).toEqual({ ok: false, error: 'BAD_NOTE', detail: '지울 수 없는 이름: 쿠폰' });
    expect(노트겹치기(앞, [], [' 한눈에'])).toMatchObject({ ok: false, error: 'BAD_NOTE', detail: '늘 있는 문서는 못 지운다: 한눈에' });
  });

  it('본문이 상한을 넘으면 NOTE_TOO_LONG 이다', () => {
    const r = 노트겹치기(다섯, [문서('쿠폰', 'ㄱ'.repeat(노트상한.본문 + 1))]);
    expect(r).toMatchObject({ ok: false, error: 'NOTE_TOO_LONG' });
  });

  it('문서가 40개를 넘으면 NOTE_TOO_LONG 이다', () => {
    const 많이 = Array.from({ length: 노트상한.문서 - 늘있는문서.length + 1 }, (_, i) => 문서(`기능 ${i}`));
    expect(노트겹치기(다섯, 많이)).toMatchObject({ ok: false, error: 'NOTE_TOO_LONG' });
  });

  it('늘 있는 문서를 지우거나 같은 이름을 둘 보내면 BAD_NOTE 다', () => {
    expect(노트겹치기(다섯, [], ['한눈에'])).toMatchObject({ ok: false, error: 'BAD_NOTE' });
    expect(노트겹치기(다섯, [문서('쿠폰'), 문서('쿠폰')])).toMatchObject({ ok: false, error: 'BAD_NOTE' });
  });

  it('최근 바뀐 것이 30줄을 넘으면 BAD_NOTE 다', () => {
    const 줄 = Array.from({ length: 노트상한.최근줄 + 1 }, (_, i) => `- 10-${i} 바뀜`).join('\n');
    expect(노트겹치기(다섯, [문서('최근 바뀐 것', 줄)])).toMatchObject({ ok: false, error: 'BAD_NOTE' });
  });
});
