// 가이드 첨부 글자 뽑기 — .md · .txt 그대로, .docx 문단 글자, 압축 폭탄 거절, PDF 머리 확인

import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import { PDF인가, 글자뽑기, 문단글자, 풀기상한 } from './text.js';

const 워드 = async (본문: string, 압축 = true) => {
  const zip = new JSZip();
  zip.file('word/document.xml', 본문);
  return zip.generateAsync({ type: 'nodebuffer', compression: 압축 ? 'DEFLATE' : 'STORE' });
};
const 문서 = (문단들: string[]) =>
  `<?xml version="1.0"?><w:document><w:body>${문단들.map((p) => `<w:p><w:pPr/>${p}</w:p>`).join('')}</w:body></w:document>`;

describe('글자뽑기', () => {
  it('.md · .txt 는 UTF-8 그대로', async () => {
    expect(await 글자뽑기('규칙.MD', Buffer.from('# 테스트 주문은 qa- 로'))).toBe('# 테스트 주문은 qa- 로');
    expect(await 글자뽑기('메모.txt', Buffer.from('결제는 테스트 카드만'))).toBe('결제는 테스트 카드만');
  });

  it('.docx 는 문단마다 줄을 바꾸고 한 문단의 조각 글자를 잇는다', async () => {
    const 몸 = await 워드(문서(['<w:r><w:t>주문은 </w:t></w:r><w:r><w:t xml:space="preserve">qa- 로 시작</w:t></w:r>', '<w:r><w:t>A &amp; B &lt;끝&gt; &#xAC00;&#44032;</w:t></w:r>']));
    expect(await 글자뽑기('정책.docx', 몸)).toBe('주문은 qa- 로 시작\nA & B <끝> 가가');
  });

  it('.pdf · .doc 이거나 워드가 아니면 null', async () => {
    expect(await 글자뽑기('소개.pdf', Buffer.from('%PDF-1.4'))).toBeNull();
    expect(await 글자뽑기('옛.doc', Buffer.from('아무거나'))).toBeNull();
    expect(await 글자뽑기('깨짐.docx', Buffer.from('zip 아님'))).toBeNull();
    const 본문없음 = new JSZip();
    본문없음.file('a.txt', 'x');
    expect(await 글자뽑기('빈.docx', await 본문없음.generateAsync({ type: 'nodebuffer' }))).toBeNull();
  });

  it('풀면 상한을 넘는 본문은 풀지 않는다', async () => {
    const 폭탄 = await 워드(문서([`<w:r><w:t>${' '.repeat(풀기상한)}</w:t></w:r>`]));
    expect(폭탄.length).toBeLessThan(1024 * 1024);
    expect(await 글자뽑기('폭탄.docx', 폭탄)).toBeNull();
  });
});

describe('문단글자', () => {
  it('범위 밖 문자 번호는 던지지 않고 비운다', () => {
    expect(문단글자('<w:p><w:t>a&#99999999;b</w:t></w:p>')).toBe('ab');
  });

  it('탭 · 줄바꿈을 살리고 빈 문단은 빈 줄, 글상자 안 문단 뒤 글자도 잃지 않는다', () => {
    const xml =
      '<w:p><w:r><w:t>주문번호</w:t><w:tab/><w:t>qa-로 시작</w:t><w:br/><w:t>둘째 줄</w:t></w:r></w:p>' +
      '<w:p w:rsidR="00AB"/>' +
      '<w:p><w:r><w:t>앞</w:t></w:r><w:r><w:txbxContent><w:p><w:r><w:t>상자</w:t></w:r></w:p></w:txbxContent></w:r><w:r><w:t>뒤</w:t></w:r></w:p>' +
      '<w:p><w:r><w:t/></w:r></w:p>';
    expect(문단글자(xml)).toBe('주문번호\tqa-로 시작\n둘째 줄\n\n앞상자\n뒤\n');
  });

  it('닫히지 않은 여는 태그가 수백만 개여도 한 번만 훑는다', () => {
    const 시작 = Date.now();
    expect(문단글자('<w:p >'.repeat(2_000_000))).toBe('');
    expect(문단글자('<'.repeat(5_000_000))).toBe('');
    expect(Date.now() - 시작).toBeLessThan(3000);
  });
});

describe('PDF인가', () => {
  it('파일 머리가 %PDF- 일 때만', () => {
    expect(PDF인가(Buffer.from('%PDF-1.7\n...'))).toBe(true);
    expect(PDF인가(Buffer.from('<html><script>'))).toBe(false);
    expect(PDF인가(Buffer.from(''))).toBe(false);
  });
});
