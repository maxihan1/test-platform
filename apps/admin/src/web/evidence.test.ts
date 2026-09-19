import { describe, expect, it } from 'vitest';

import type { EvidenceRow } from './api.js';
import { 받는법, 증적버튼 } from './evidence.js';

function 증적(format: string, status: string): EvidenceRow {
  return {
    id: 1,
    format,
    status,
    filePath: status === 'READY' ? `artifacts/evidence/1.${format.toLowerCase()}` : null,
    error: status === 'FAILED' ? '스크린샷을 찾지 못했습니다' : null,
    generatedAt: '2026-09-19T04:00:00.000Z',
  };
}

describe('증적 문서 버튼 (SPEC §8.4)', () => {
  it('실행이 도는 중이면 누를 수 없고 언제 되는지 알려준다', () => {
    const 것 = 증적버튼('RUNNING', [], 'operator');
    expect(것).toMatchObject({ 누를수있나: false, 글: '실행이 끝나면 만들 수 있습니다' });
  });

  it('끝났고 문서가 없으면 만들 수 있다', () => {
    expect(증적버튼('FINISHED', [], 'operator')).toMatchObject({
      누를수있나: true,
      글: '증적 문서 만들기',
    });
  });

  it('만드는 중이면 다시 눌리지 않는다. 새로고침할 때마다 또 눌리면 문서 행이 쌓인다', () => {
    expect(증적버튼('FINISHED', [증적('PDF', 'PENDING')], 'operator')).toMatchObject({
      누를수있나: false,
      글: '만드는 중입니다',
    });
  });

  it('실패했으면 사유와 함께 다시 만들기를 준다', () => {
    const 것 = 증적버튼('FINISHED', [증적('PDF', 'FAILED')], 'operator');
    expect(것).toMatchObject({ 누를수있나: true, 글: '다시 만들기' });
    expect(것?.사유).toBe('스크린샷을 찾지 못했습니다');
  });

  it('이미 만든 것이 있어도 다시 만들 수 있다. 같은 실행의 증적은 언제 뽑아도 같다', () => {
    expect(증적버튼('FINISHED', [증적('PDF', 'READY')], 'operator')).toMatchObject({
      누를수있나: true,
      글: '다시 만들기',
    });
  });

  it('중단된 실행도 만들 수 있다. 여기까지 돌았다가 증적으로 성립한다', () => {
    expect(증적버튼('ABORTED', [], 'operator')?.누를수있나).toBe(true);
  });

  it('보기만 등급에게는 만들기 버튼이 아예 없다 (SPEC §3.5)', () => {
    expect(증적버튼('FINISHED', [], 'viewer')).toBe(null);
  });
});

describe('만든 문서를 어떻게 받나 (SPEC §8.4)', () => {
  it('PDF 는 새 창에서 연다. 제출물이고 눌러서 바로 보인다', () => {
    expect(받는법('PDF')).toMatchObject({ 글: '열기 ↗', 새창: true });
  });

  it('HTML 도 새 창이다. Ctrl+F 가 된다', () => {
    expect(받는법('HTML')).toMatchObject({ 글: '열기 ↗', 새창: true });
  });

  it('엑셀은 브라우저가 못 연다. 받기로 내려받는다', () => {
    expect(받는법('XLSX')).toMatchObject({ 글: '받기', 새창: false });
  });

  it('대소문자를 가리지 않는다. 서버가 소문자로 저장할 수도 있다', () => {
    expect(받는법('pdf').새창).toBe(true);
    expect(받는법('xlsx').새창).toBe(false);
  });

  it('모르는 형식은 받기로 둔다. 열린다고 해 놓고 파일이 떨어지면 사람이 찾는다', () => {
    expect(받는법('무엇인가')).toMatchObject({ 글: '받기', 새창: false });
  });
});
