// 워드 메모 사본 검사 — pandoc 이 만드는 모양을 흉내 낸 docx 에 메모를 달고 다시 풀어 본다 (도메인/작성 §3.6 「★ 역방향」 표시)
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import { 글칸가리기, 메모달기 } from './authoring-docx.js';

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

const 본문 = [
  '<w:p><w:pPr><w:pStyle w:val="Heading1" /></w:pPr><w:r><w:t xml:space="preserve">결제 기획서</w:t></w:r></w:p>',
  '<w:p><w:pPr><w:pStyle w:val="FirstParagraph" /></w:pPr><w:r><w:t xml:space="preserve">저장 버튼을 누르면</w:t></w:r><w:r><w:t xml:space="preserve"> </w:t></w:r><w:r><w:rPr><w:b /></w:rPr><w:t xml:space="preserve">주문이 저장된다</w:t></w:r><w:r><w:t>.</w:t></w:r></w:p>',
  '<w:p><w:pPr><w:pStyle w:val="Compact" /><w:numPr><w:ilvl w:val="0" /><w:numId w:val="1001" /></w:numPr></w:pPr><w:r><w:t>엑셀 내려받기를 지원한다</w:t></w:r></w:p>',
  '<w:tbl><w:tr><w:tc><w:tcPr /><w:p><w:pPr><w:pStyle w:val="Compact" /></w:pPr><w:r><w:t>쿠폰 &amp; 할인</w:t></w:r></w:p></w:tc></w:tr></w:tbl>',
  '<w:p><w:r><w:instrText>저장 버튼</w:instrText></w:r><w:r><w:delText>저장 버튼</w:delText></w:r></w:p>',
  '<w:p><w:r><w:pict><w:txbxContent><w:p><w:r><w:t>상자 속 저장 버튼</w:t></w:r></w:p></w:txbxContent></w:pict></w:r><w:r><w:t>상자 밖 끝 문단</w:t></w:r></w:p>',
].join('');

async function 워드(선택: { 메모파일?: 'self-closing' | 'none' | 'existing' } = {}): Promise<Uint8Array> {
  const z = new JSZip();
  const 메모 = 선택.메모파일 ?? 'self-closing';
  z.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml" /><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" /><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml" />${메모 === 'none' ? '' : '<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml" />'}</Types>`,
  );
  z.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml" /></Relationships>',
  );
  z.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Id="rId7" Target="styles.xml" />${메모 === 'none' ? '' : '<Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Id="rId1" Target="comments.xml" />'}</Relationships>`,
  );
  z.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document ${W}><w:body>${본문}<w:sectPr /></w:body></w:document>`);
  if (메모 === 'self-closing') z.file('word/comments.xml', `<?xml version="1.0" encoding="UTF-8"?><w:comments ${W} />`);
  if (메모 === 'existing') {
    z.file(
      'word/comments.xml',
      `<?xml version="1.0" encoding="UTF-8"?><w:comments ${W}><w:comment w:id="7" w:author="기획자"><w:p><w:r><w:t>원래 메모</w:t></w:r></w:p></w:comment></w:comments>`,
    );
  }
  return z.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

async function 풀기(바이트: Uint8Array) {
  const z = await JSZip.loadAsync(바이트);
  const 읽기 = async (p: string) => (await z.file(p)?.async('string')) ?? '';
  return {
    문서: await 읽기('word/document.xml'),
    메모: await 읽기('word/comments.xml'),
    관계: await 읽기('word/_rels/document.xml.rels'),
    종류: await 읽기('[Content_Types].xml'),
  };
}

const 날짜 = '2026-09-26T00:00:00Z';

describe('메모달기 — 워드 원본에 메모를 단 사본', () => {
  it('여러 조각에 걸친 문장을 찾아 그 문단에 메모를 건다 — 스타일(pPr) 뒤에서 시작한다', async () => {
    const 결과 = await 메모달기(await 워드(), [{ anchor: '저장 버튼을 누르면  주문이\n저장된다', 글: '[D1] 화면과 다름 — 화면: 확인' }], 날짜);
    if ('사유' in 결과) throw new Error(결과.사유);
    expect(결과.찾음).toEqual([true]);
    const { 문서, 메모 } = await 풀기(결과.바이트);
    expect(문서).toContain('<w:pStyle w:val="FirstParagraph" /></w:pPr><w:commentRangeStart w:id="0"/>');
    expect(문서).toMatch(/주문이 저장된다<\/w:t><\/w:r><w:r><w:t>\.<\/w:t><\/w:r><w:commentRangeEnd w:id="0"\/><w:r><w:commentReference w:id="0"\/><\/w:r><\/w:p>/);
    expect(메모).toContain('w:author="테스트 플랫폼"');
    expect(메모).toContain('[D1] 화면과 다름 — 화면: 확인');
  });

  it('엔티티를 풀어 비교한다 — 표 칸의 「쿠폰 & 할인」', async () => {
    const 결과 = await 메모달기(await 워드(), [{ anchor: '쿠폰 & 할인', 글: 'x' }], 날짜);
    expect('찾음' in 결과 && 결과.찾음).toEqual([true]);
  });

  it('필드 명령·지운 글·텍스트 상자 속 글에서는 찾지 않는다', async () => {
    const 결과 = await 메모달기(await 워드(), [{ anchor: '상자 속 저장 버튼', 글: 'x' }], 날짜);
    expect('찾음' in 결과 && 결과.찾음).toEqual([false]);
    const 둘 = await 메모달기(await 워드(), [{ anchor: '저장 버튼', 글: 'x' }], 날짜);
    if ('사유' in 둘) throw new Error(둘.사유);
    const { 문서 } = await 풀기(둘.바이트);
    expect(문서.indexOf('commentRangeStart')).toBeLessThan(문서.indexOf('주문이 저장된다'));
    expect(문서.indexOf('commentRangeStart')).toBeGreaterThan(문서.indexOf('결제 기획서'));
  });

  it('문장이 없으면 마지막 문단에 단다 — 텍스트 상자 안이 아니라 바깥 문단', async () => {
    const 결과 = await 메모달기(await 워드(), [{ anchor: null, 글: '[D2] 문서에 없음' }], 날짜);
    if ('사유' in 결과) throw new Error(결과.사유);
    expect(결과.찾음).toEqual([true]);
    const { 문서 } = await 풀기(결과.바이트);
    expect(문서).toMatch(/상자 밖 끝 문단<\/w:t><\/w:r><w:commentRangeEnd w:id="0"\/>/);
    expect(문서).toContain('<w:txbxContent><w:p><w:r><w:t>상자 속 저장 버튼</w:t></w:r></w:p></w:txbxContent>');
  });

  it('못 찾은 메모는 거짓으로 알리고 나머지는 단다', async () => {
    const 결과 = await 메모달기(await 워드(), [{ anchor: '없는 문장', 글: 'a' }, { anchor: '엑셀 내려받기', 글: 'b' }], 날짜);
    expect('찾음' in 결과 && 결과.찾음).toEqual([false, true]);
  });

  it('메모 글의 < & 를 이스케이프한다', async () => {
    const 결과 = await 메모달기(await 워드(), [{ anchor: '엑셀', 글: '<b> & "x"' }], 날짜);
    if ('사유' in 결과) throw new Error(결과.사유);
    expect((await 풀기(결과.바이트)).메모).toContain('&lt;b&gt; &amp; &quot;x&quot;');
  });

  it('기존 메모가 있으면 번호를 최대값 뒤로 잇고 원래 메모를 남긴다', async () => {
    const 결과 = await 메모달기(await 워드({ 메모파일: 'existing' }), [{ anchor: '엑셀', 글: '새 메모' }], 날짜);
    if ('사유' in 결과) throw new Error(결과.사유);
    const { 문서, 메모 } = await 풀기(결과.바이트);
    expect(메모).toContain('원래 메모');
    expect(메모).toContain('w:id="8"');
    expect(문서).toContain('<w:commentRangeStart w:id="8"/>');
  });

  it('메모 파트가 없으면 만들고 관계·종류에 한 번씩 등록한다', async () => {
    const 결과 = await 메모달기(await 워드({ 메모파일: 'none' }), [{ anchor: '엑셀', 글: 'a' }, { anchor: '결제', 글: 'b' }], 날짜);
    if ('사유' in 결과) throw new Error(결과.사유);
    const { 메모, 관계, 종류 } = await 풀기(결과.바이트);
    expect(메모).toContain('<w:comments ');
    expect(관계.match(/relationships\/comments"/g)).toHaveLength(1);
    expect(관계).toContain('Id="rId8"');
    expect(종류.match(/PartName="\/word\/comments\.xml"/g)).toHaveLength(1);
  });

  it('원본 문단 글은 그대로다', async () => {
    const 결과 = await 메모달기(await 워드(), [{ anchor: '엑셀', 글: 'a' }], 날짜);
    if ('사유' in 결과) throw new Error(결과.사유);
    const 문서 = (await 풀기(결과.바이트)).문서.replace(/<w:commentRange(Start|End) w:id="\d+"\/>|<w:r><w:commentReference w:id="\d+"\/><\/w:r>/g, '');
    expect(문서).toContain(본문);
  });

  it('비밀번호 검사용 글을 돌려준다 — 모든 파트를 엔티티 풀어서', async () => {
    const 결과 = await 메모달기(await 워드(), [{ anchor: '쿠폰', 글: 'a' }], 날짜);
    expect('글들' in 결과 && 결과.글들.some((g) => g.includes('쿠폰 & 할인'))).toBe(true);
  });

  it('문단 여는 태그 뒤에 줄바꿈이 있어도 메모 시작은 문단 속성 뒤다 — 앞이면 워드가 문서를 못 연다', async () => {
    const z = await JSZip.loadAsync(await 워드());
    const 문서 = (await z.file('word/document.xml')!.async('string')).replace(
      '<w:p><w:pPr><w:pStyle w:val="Compact" /><w:numPr>',
      '<w:p>\n    <w:pPr><w:pStyle w:val="Compact" /><w:numPr>',
    );
    z.file('word/document.xml', 문서);
    const 결과 = await 메모달기(await z.generateAsync({ type: 'uint8array' }), [{ anchor: '엑셀', 글: 'a' }], 날짜);
    if ('사유' in 결과) throw new Error(결과.사유);
    const 다시 = (await 풀기(결과.바이트)).문서;
    expect(다시.indexOf('commentRangeStart')).toBeGreaterThan(다시.indexOf('<w:numId w:val="1001" />'));
  });

  it('메모 글에서 XML 이 못 쓰는 제어 문자를 뺀다 — 들어가면 워드가 사본을 못 연다', async () => {
    const 결과 = await 메모달기(await 워드(), [{ anchor: '엑셀', 글: 'a\u000bb\u0000c' }], 날짜);
    if ('사유' in 결과) throw new Error(결과.사유);
    const 메모 = (await 풀기(결과.바이트)).메모;
    expect(메모).toContain('>abc<');
    expect(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(메모)).toBe(false);
  });

  it('머리글에서 글 조각으로 갈린 비밀번호도 이어 붙여 찾게 준다', async () => {
    const z = await JSZip.loadAsync(await 워드());
    z.file('word/header1.xml', `<w:hdr ${W}><w:p><w:r><w:t>Qa-pw</w:t></w:r><w:r><w:t>-7731</w:t></w:r></w:p></w:hdr>`);
    const 결과 = await 메모달기(await z.generateAsync({ type: 'uint8array' }), [{ anchor: '엑셀', 글: 'a' }], 날짜);
    expect('글들' in 결과 && 결과.글들.some((g) => g.includes('Qa-pw-7731'))).toBe(true);
  });

  it('워드가 아니면 사유', async () => {
    expect(await 메모달기(new Uint8Array([1, 2, 3]), [], 날짜)).toHaveProperty('사유');
  });

  it('푼 크기가 상한을 넘으면 사유 — 압축 폭탄', async () => {
    const z = await JSZip.loadAsync(await 워드());
    z.file('word/media/폭탄.bin', new Uint8Array(70 * 1024 * 1024));
    const 폭탄 = await z.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    expect(폭탄.length).toBeLessThan(1024 * 1024);
    expect(await 메모달기(폭탄, [{ anchor: '엑셀', 글: 'a' }], 날짜)).toEqual({ 사유: '워드 파일을 풀면 너무 크다' });
  });
});

describe('글칸가리기 — 사람이 읽는 글 칸에서만 비밀번호를 가린다', () => {
  const 가림 = '••••••';
  it('한 칸 안의 비밀번호를 가린다', () => {
    expect(글칸가리기('<w:p><w:r><w:t>비번 Pw9!x 입력</w:t></w:r></w:p>', 'Pw9!x')).toBe(`<w:p><w:r><w:t>비번 ${가림} 입력</w:t></w:r></w:p>`);
  });
  it('여러 칸으로 갈린 비밀번호도 가린다 — 첫 칸에 가림표, 나머지 칸은 걸친 글자를 뺀다', () => {
    const xml = '<w:r><w:t>비번 Pw</w:t></w:r><w:r w:rsidR="00A1"><w:t xml:space="preserve">9!</w:t></w:r><w:r><w:t>x 입력</w:t></w:r>';
    expect(글칸가리기(xml, 'Pw9!x')).toBe(
      `<w:r><w:t>비번 ${가림}</w:t></w:r><w:r w:rsidR="00A1"><w:t xml:space="preserve"></w:t></w:r><w:r><w:t> 입력</w:t></w:r>`,
    );
  });
  it('이스케이프된 글도 풀어서 찾고 다시 싸서 쓴다', () => {
    expect(글칸가리기('<w:t>a&amp;b &lt;c</w:t>', 'a&b')).toBe(`<w:t>${가림} &lt;c</w:t>`);
  });
  it('속성값은 건드리지 않는다 — 1234 같은 비밀번호가 번호 속성과 겹쳐도 워드가 안 깨진다', () => {
    const xml = '<w:tc><w:tcW w:w="1234"/><w:p w:rsidR="00A71234"><w:r><w:t>칸</w:t></w:r></w:p></w:tc>';
    expect(글칸가리기(xml, '1234')).toBe(xml);
  });
  it('변경 추적의 지운 글 · 필드 코드 · 차트 글(a:t)도 가린다', () => {
    const xml = '<w:delText>Pw9!x</w:delText><w:instrText> HYPERLINK "Pw9!x" </w:instrText><a:t>Pw9!x</a:t>';
    expect(글칸가리기(xml, 'Pw9!x')).toBe(`<w:delText>${가림}</w:delText><w:instrText> HYPERLINK &quot;${가림}&quot; </w:instrText><a:t>${가림}</a:t>`);
  });
  it('비밀이 없으면 그대로다', () => {
    expect(글칸가리기('<w:t>Pw9!x</w:t>', undefined)).toBe('<w:t>Pw9!x</w:t>');
  });
});

describe('메모달기 — 비밀번호를 받으면 사본에서 먼저 가린다', () => {
  async function 비번워드(): Promise<Uint8Array> {
    const z = await JSZip.loadAsync(await 워드());
    z.file(
      'word/document.xml',
      `<?xml version="1.0" encoding="UTF-8"?><w:document ${W}><w:body><w:p w:rsidR="00001234"><w:r><w:t>테스트 계정 비밀번호는 Pw</w:t></w:r><w:r><w:t>9!x 이다</w:t></w:r></w:p><w:sectPr /></w:body></w:document>`,
    );
    z.file('word/header1.xml', `<?xml version="1.0" encoding="UTF-8"?><w:hdr ${W}><w:p><w:r><w:t>머리 Pw9!x</w:t></w:r></w:p></w:hdr>`);
    return z.generateAsync({ type: 'uint8array' });
  }
  it('올릴 글 어디에도 원문이 없고, 가린 문장을 anchor 로 줘도 메모가 붙는다', async () => {
    const 결과 = await 메모달기(await 비번워드(), [{ anchor: '테스트 계정 비밀번호는 •••••• 이다', 글: '[D1] x' }], 날짜, 'Pw9!x');
    if ('사유' in 결과) throw new Error(결과.사유);
    expect(결과.찾음).toEqual([true]);
    expect(결과.글들.some((g) => g.includes('Pw9!x'))).toBe(false);
    const z = await JSZip.loadAsync(결과.바이트);
    expect(await z.file('word/header1.xml')?.async('string')).toContain('머리 ••••••');
    expect(await z.file('word/document.xml')?.async('string')).toContain('w:rsidR="00001234"');
  });
  it('비밀번호를 안 주면 예전처럼 원문이 글들에 남는다 — 누설 검사가 잡는다', async () => {
    const 결과 = await 메모달기(await 비번워드(), [{ anchor: '이다', 글: 'x' }], 날짜);
    if ('사유' in 결과) throw new Error(결과.사유);
    expect(결과.글들.some((g) => g.includes('Pw9!x'))).toBe(true);
  });
});
