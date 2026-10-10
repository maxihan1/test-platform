// 표준 기획서 한 판을 워드(.docx)로 만든다 — 기능 묶음마다 표 하나, 확인 필요 줄은 바탕색 (도메인/작성 §3.6 「워드로 내려받기」 · 2026-10-10 시안 A)
// pandoc 없이 워드 파트를 직접 쓴다 — pandoc 은 author 이미지에만 있다. 순수 함수다: 판 읽기 · 비밀번호 읽기 · 시각은 부르는 쪽 몫

import type { PrdItem } from '@platform/kit';
import JSZip from 'jszip';

import { 싼글 } from '../../../../scripts/authoring-docx.js';
import { 비밀가리기 } from '../../../../scripts/authoring-reverse.js';
import { 묶음들 } from '../web/prdView.js';

export interface 워드자료 {
  service: string;
  version: number;
  /** 표에 그대로 적는 글자 — 시간대 변환은 부르는 쪽 몫 */
  generatedAt: string;
  items: PrdItem[];
}

const 상태글 = { CONFIRMED: '확정', NEEDS_CHECK: '확인 필요' } as const;
// A4 에 여백 1인치면 글 폭이 9026 트윕이다 — 칸 넷을 그 안에 나눈다. 번호 · 「확인 필요」가 한 줄에 들 만큼은 준다
const 칸폭 = [1800, 3200, 1250, 2776];
const 머리바탕 = 'F1EFEB';
const 확인바탕 = 'FFF1E4';
const 확인글색 = 'B4560A';
const 흐린글색 = '5F5B55';

/** 줄바꿈은 `<w:br/>` 로 — `<w:t>` 안의 줄바꿈은 워드가 빈칸으로 읽는다 */
function 런(글: string, 꾸밈 = ''): string {
  const 속 = 글.split(/\r?\n/).map((줄) => `<w:t xml:space="preserve">${싼글(줄)}</w:t>`).join('<w:br/>');
  return `<w:r>${꾸밈 === '' ? '' : `<w:rPr>${꾸밈}</w:rPr>`}${속}</w:r>`;
}

function 문단(글: string, { 꼴, 꾸밈 }: { 꼴?: string; 꾸밈?: string } = {}): string {
  return `<w:p>${꼴 === undefined ? '' : `<w:pPr><w:pStyle w:val="${꼴}"/></w:pPr>`}${런(글, 꾸밈)}</w:p>`;
}

function 칸(폭: number, 속: string, 바탕?: string): string {
  const 칠 = 바탕 === undefined ? '' : `<w:shd w:val="clear" w:color="auto" w:fill="${바탕}"/>`;
  return `<w:tc><w:tcPr><w:tcW w:w="${String(폭)}" w:type="dxa"/>${칠}</w:tcPr>${속}</w:tc>`;
}

function 줄(x: PrdItem): string {
  const 확인 = x.status === 'NEEDS_CHECK';
  const 바탕 = 확인 ? 확인바탕 : undefined;
  const 근거 = x.basis
    .map(
      (b) =>
        문단(b.ref === undefined ? b.from : `${b.from} · ${b.ref}`, { 꾸밈: `<w:color w:val="${흐린글색}"/>` }) +
        문단(`“${b.quote}”`),
    )
    .join('');
  return (
    '<w:tr>' +
    칸(칸폭[0]!, 문단(x.reqId), 바탕) +
    칸(칸폭[1]!, 문단(x.text), 바탕) +
    칸(칸폭[2]!, 문단(상태글[x.status], { 꾸밈: 확인 ? `<w:b/><w:color w:val="${확인글색}"/>` : '' }), 바탕) +
    칸(칸폭[3]!, 근거, 바탕) +
    '</w:tr>'
  );
}

function 표(items: PrdItem[]): string {
  const 선 = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
    .map((자리) => `<w:${자리} w:val="single" w:sz="4" w:space="0" w:color="C9C5BF"/>`)
    .join('');
  // 머리 줄은 쪽이 넘어가도 다시 찍는다(tblHeader) — 요구가 수백 건이면 표가 여러 쪽이다
  const 머리 =
    '<w:tr><w:trPr><w:tblHeader/></w:trPr>' +
    ['번호', '요구 문장', '상태', '근거'].map((글, i) => 칸(칸폭[i]!, 문단(글, { 꾸밈: '<w:b/>' }), 머리바탕)).join('') +
    '</w:tr>';
  return (
    // 폭을 비율로 주면 글 양에 따라 표마다 칸 폭이 달라진다 — 고정 폭으로 묶음끼리 줄을 맞춘다
    `<w:tbl><w:tblPr><w:tblW w:w="${String(칸폭.reduce((a, b) => a + b))}" w:type="dxa"/><w:tblBorders>${선}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr>` +
    `<w:tblGrid>${칸폭.map((w) => `<w:gridCol w:w="${String(w)}"/>`).join('')}</w:tblGrid>` +
    머리 +
    items.map(줄).join('') +
    '</w:tbl>'
  );
}

/** 글이 들어가는 칸 전부에서 비밀번호를 가린다. 긴 것부터 — 짧은 것이 긴 것 안에 들면 긴 것의 남은 글자가 샌다 */
function 가린항목(items: PrdItem[], 비밀번호들: string[]): PrdItem[] {
  const 차례 = [...비밀번호들].sort((a, b) => b.length - a.length);
  const 가림 = (글: string) => 차례.reduce((g, 비밀) => 비밀가리기(g, 비밀), 글);
  return items.map((x) => ({
    ...x,
    feature: 가림(x.feature),
    text: 가림(x.text),
    basis: x.basis.map((b) => ({
      from: 가림(b.from),
      ...(b.ref === undefined ? {} : { ref: 가림(b.ref) }),
      quote: 가림(b.quote),
    })),
  }));
}

const 스타일 =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
  '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Malgun Gothic" w:hAnsi="Malgun Gothic" w:eastAsia="맑은 고딕"/><w:sz w:val="19"/><w:lang w:eastAsia="ko-KR"/></w:rPr></w:rPrDefault>' +
  '<w:pPrDefault><w:pPr><w:spacing w:after="40" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
  '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="80"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style>' +
  // 제목 1 이어야 워드 탐색 창에 기능 묶음이 차례로 뜬다
  '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>' +
  '</w:styles>';

const 종류표 =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
  '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
  '</Types>';

const 관계 = (종류: string, 대상: string) =>
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${종류}" Target="${대상}"/>` +
  '</Relationships>';

export async function 워드만들기(자료: 워드자료, 비밀번호들: string[]): Promise<Uint8Array> {
  const items = 가린항목(자료.items, 비밀번호들);
  const 확인수 = items.filter((x) => x.status === 'NEEDS_CHECK').length;
  const 머리글 = `판 ${String(자료.version)} · 요구 ${String(items.length)}건 · 확인 필요 ${String(확인수)}건 · ${자료.generatedAt} 내려받음`;
  const 몸 =
    문단(`${자료.service} 표준 기획서`, { 꼴: 'Title' }) +
    문단(머리글, { 꾸밈: `<w:color w:val="${흐린글색}"/>` }) +
    묶음들(items)
      .map((g) => 문단(g.feature, { 꼴: 'Heading1' }) + 표(g.items))
      .join('') +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>';
  const zip = new JSZip();
  zip.file('[Content_Types].xml', 종류표);
  zip.file('_rels/.rels', 관계('officeDocument', 'word/document.xml'));
  zip.file('word/_rels/document.xml.rels', 관계('styles', 'styles.xml'));
  zip.file('word/styles.xml', 스타일);
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${몸}</w:body></w:document>`,
  );
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
