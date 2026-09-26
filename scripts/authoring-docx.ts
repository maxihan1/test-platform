// 워드(.docx) 원본에 메모를 단 사본을 만든다 — 바이트 → 바이트, 파일·네트워크 없음 (도메인/작성 §3.6 「★ 역방향」 표시)
// jszip 정식 의존성 2026-09-26 사용자 승인. 원본 문단 글은 한 글자도 안 바꾸고 메모 표시만 끼운다

import { posix } from 'node:path';

import JSZip from 'jszip';

/** 메모 작성자 — 기계가 단 메모라는 것이 보이게 고정한다(요청자 이름이면 사람이 직접 단 것처럼 보인다 — 2026-09-26 게이트 1) */
const 작성자 = '테스트 플랫폼';
/** 다루는 XML 파트 하나의 상한 · 파일 전체를 풀었을 때의 상한 · 다시 묶은 결과의 상한(서버 한 파일 상한) */
const 파트상한 = 10 * 1024 * 1024;
const 합계상한 = 60 * 1024 * 1024;
const 결과상한 = 20 * 1024 * 1024;

const 메모관계 = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments';
const 메모종류 = 'application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml';

function 풀글(s: string): string {
  return s.replace(/&(amp|lt|gt|quot|apos|#\d{1,7}|#x[0-9a-fA-F]{1,6});/g, (_, e: string) => {
    if (e === 'amp') return '&';
    if (e === 'lt') return '<';
    if (e === 'gt') return '>';
    if (e === 'quot') return '"';
    if (e === 'apos') return "'";
    const n = e.startsWith('#x') ? parseInt(e.slice(2), 16) : Number(e.slice(1));
    return n <= 0x10ffff ? String.fromCodePoint(n) : '';
  });
}

/** 메모 글을 XML 에 넣을 모양으로. XML 1.0 이 못 쓰는 제어 문자는 뺀다 — 들어가면 워드가 사본을 못 연다 (2026-09-26 검사) */
function 싼글(s: string): string {
  return s
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** 공백을 한 칸으로 — 자식이 읽는 글(pandoc)과 원본의 줄 꺾음·겹 공백이 달라도 맞게 */
function 고른글(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * **실제로 풀리는 바이트**를 센다. zip 머리글의 크기는 만든 사람이 적은 값이라 거짓일 수 있다.
 * 넘으면 그 자리에서 멈춘다 — 다 풀고 나서 재면 압축 폭탄에 메모리가 먼저 터진다 (2026-09-26 계획 검토)
 */
function 푼크기(파일: JSZip.JSZipObject, 상한: number): Promise<number | null> {
  return new Promise((resolve, reject) => {
    let n = 0;
    let 끝남 = false;
    const 흐름 = 파일.nodeStream('nodebuffer');
    흐름
      .on('data', (조각: Buffer) => {
        n += 조각.length;
        if (n > 상한 && !끝남) {
          끝남 = true;
          흐름.pause();
          resolve(null);
        }
      })
      .on('error', (e: Error) => {
        if (!끝남) {
          끝남 = true;
          reject(e);
        }
      })
      .on('end', () => {
        if (!끝남) {
          끝남 = true;
          resolve(n);
        }
      });
  });
}

interface 문단 {
  여는끝: number;
  닫는시작: number;
  글: string;
}

/**
 * 본문의 **맨 바깥** 문단들. 텍스트 상자(`w:txbxContent`) 속 문단은 바깥 문단 안에 겹쳐 있어 건너뛴다.
 * `<w:p` 뒤가 공백·`>`·`/` 인 것만 문단이다 — `<w:pPr>`·`<w:pStyle>` 을 문단으로 잡지 않는다.
 * 글은 `<w:t>` 만 — 지운 글(`w:delText`)·필드 명령(`w:instrText`)은 사람이 읽는 글이 아니다
 */
function 문단들(문서: string): 문단[] {
  const 결과: 문단[] = [];
  const 쌓임: { 여는끝: number }[] = [];
  for (const m of 문서.matchAll(/<w:p(?=[\s>/])[^>]*>|<\/w:p>/g)) {
    const 태그 = m[0];
    const 자리 = m.index ?? 0;
    if (태그 === '</w:p>') {
      const 연것 = 쌓임.pop();
      if (연것 === undefined || 쌓임.length > 0) continue;
      const 속 = 문서
        .slice(연것.여는끝, 자리)
        .replace(/<w:txbxContent[\s\S]*?<\/w:txbxContent>/g, '')
        .replace(/<mc:Fallback[\s\S]*?<\/mc:Fallback>/g, '');
      const 글 = [...속.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((t) => 풀글(t[1] ?? '')).join('');
      결과.push({ 여는끝: 연것.여는끝, 닫는시작: 자리, 글 });
    } else if (!태그.endsWith('/>')) {
      쌓임.push({ 여는끝: 자리 + 태그.length });
    }
  }
  return 결과;
}

/** 메모 시작 표시는 문단 속성(`w:pPr`) 뒤에 둔다 — 앞에 두면 워드가 문서를 고친다고 묻는다 */
function 시작자리(문서: string, 여는끝: number): number {
  // 워드가 아닌 도구는 태그 사이에 줄바꿈·들여쓰기를 넣는다 — 공백을 건너뛰고 본다 (2026-09-26 검사)
  const 앞 = /^\s*/.exec(문서.slice(여는끝, 여는끝 + 200))?.[0].length ?? 0;
  const 자리 = 여는끝 + 앞;
  const 빈 = /^<w:pPr\s*\/>/.exec(문서.slice(자리, 자리 + 20));
  if (빈 !== null) return 자리 + 빈[0].length;
  if (!/^<w:pPr[\s>]/.test(문서.slice(자리, 자리 + 8))) return 여는끝;
  const 끝 = 문서.indexOf('</w:pPr>', 자리);
  return 끝 < 0 ? 여는끝 : 끝 + '</w:pPr>'.length;
}

function 문단찾기(들: 문단[], anchor: string | null): 문단 | undefined {
  const 글있는것 = 들.filter((p) => 고른글(p.글) !== '');
  // 붙일 문장이 없는 차이(주로 「화면에만 있다」)는 마지막 문단에 단다 (2026-09-26 게이트 1)
  if (anchor === null) return 글있는것.at(-1);
  const 찾을것 = 고른글(anchor);
  const 빈칸없이 = 찾을것.replace(/ /g, '');
  return (
    글있는것.find((p) => 고른글(p.글).includes(찾을것)) ??
    글있는것.find((p) => 고른글(p.글).replace(/ /g, '').includes(빈칸없이))
  );
}

/** 주 문서 자리 — `_rels/.rels` 의 officeDocument 관계. 없으면 흔한 자리 */
function 주문서자리(관계: string): string {
  const 줄 = [...관계.matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((r) => /\/officeDocument"/.test(r));
  const 대상 = 줄 === undefined ? null : /Target="([^"]+)"/.exec(줄)?.[1];
  return (대상 ?? 'word/document.xml').replace(/^\//, '');
}

export async function 메모달기(
  바이트: Uint8Array,
  메모들: { anchor: string | null; 글: string }[],
  날짜: string,
): Promise<{ 바이트: Uint8Array; 찾음: boolean[]; 글들: string[] } | { 사유: string }> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(바이트);
  } catch {
    return { 사유: '워드 파일을 열지 못했다' };
  }
  let 합계 = 0;
  for (const f of Object.values(zip.files)) {
    if (f.dir) continue;
    const n = await 푼크기(f, 합계상한 - 합계);
    if (n === null) return { 사유: '워드 파일을 풀면 너무 크다' };
    합계 += n;
  }
  const 읽기 = async (p: string): Promise<string | null> => {
    const f = zip.file(p);
    if (f === null) return null;
    if ((await 푼크기(f, 파트상한)) === null) throw new Error('파트가 너무 크다');
    return f.async('string');
  };

  const 주 = 주문서자리((await 읽기('_rels/.rels')) ?? '');
  const 관계자리 = posix.join(posix.dirname(주), '_rels', `${posix.basename(주)}.rels`);
  const 원문 = await 읽기(주);
  if (원문 === null) return { 사유: '워드 본문을 찾지 못했다' };
  let 문서: string = 원문;
  let 관계 =
    (await 읽기(관계자리)) ??
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';

  // 메모 파트 — 관계 파일에 있으면 그 자리, 없으면 만들고 등록한다
  const 메모줄 = [...관계.matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((r) => r.includes(`"${메모관계}"`));
  const 메모대상 = 메모줄 === undefined ? 'comments.xml' : (/Target="([^"]+)"/.exec(메모줄)?.[1] ?? 'comments.xml');
  const 메모자리 = 메모대상.startsWith('/') ? 메모대상.slice(1) : posix.join(posix.dirname(주), 메모대상);
  if (메모줄 === undefined) {
    const 큰번호 = Math.max(0, ...[...관계.matchAll(/Id="rId(\d+)"/g)].map((m) => Number(m[1])));
    관계 = 관계.replace('</Relationships>', `<Relationship Id="rId${String(큰번호 + 1)}" Type="${메모관계}" Target="${메모대상}"/></Relationships>`);
  }
  let 메모파일 =
    (await 읽기(메모자리)) ??
    '<?xml version="1.0" encoding="UTF-8"?><w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"></w:comments>';
  // pandoc 은 빈 메모 파트를 `<w:comments ... />` 로 쓴다 — 여닫는 꼴로 펴야 끼울 자리가 생긴다
  메모파일 = 메모파일.replace(/<w:comments\b([^>]*?)\s*\/>/, '<w:comments$1></w:comments>');
  let 종류 = (await 읽기('[Content_Types].xml')) ?? '';
  if (!종류.includes(`PartName="/${메모자리}"`)) {
    종류 = 종류.replace('</Types>', `<Override PartName="/${메모자리}" ContentType="${메모종류}"/></Types>`);
  }

  // 번호는 이미 쓰인 가장 큰 번호 뒤로 — 개수+1 이면 지운 메모가 있을 때 겹친다
  let 다음 = Math.max(-1, ...[...`${메모파일}${문서}`.matchAll(/w:id="(\d+)"/g)].map((m) => Number(m[1]))) + 1;
  const 들 = 문단들(문서);
  const 끼울것: { 자리: number; 글: string }[] = [];
  const 새메모: string[] = [];
  const 찾음 = 메모들.map((메모) => {
    const p = 문단찾기(들, 메모.anchor);
    if (p === undefined) return false;
    const id = String(다음);
    다음 += 1;
    끼울것.push({ 자리: 시작자리(문서, p.여는끝), 글: `<w:commentRangeStart w:id="${id}"/>` });
    끼울것.push({ 자리: p.닫는시작, 글: `<w:commentRangeEnd w:id="${id}"/><w:r><w:commentReference w:id="${id}"/></w:r>` });
    새메모.push(
      `<w:comment w:id="${id}" w:author="${작성자}" w:date="${날짜}" w:initials="TP"><w:p><w:r><w:t xml:space="preserve">${싼글(메모.글)}</w:t></w:r></w:p></w:comment>`,
    );
    return true;
  });
  // 뒤에서부터 끼운다 — 앞에서 끼우면 뒤 자리 번호가 밀린다. 같은 자리면 넣은 순서를 지킨다
  for (const k of [...끼울것].map((x, i) => ({ ...x, i })).sort((a, b) => b.자리 - a.자리 || b.i - a.i)) {
    문서 = 문서.slice(0, k.자리) + k.글 + 문서.slice(k.자리);
  }
  메모파일 = 메모파일.replace('</w:comments>', `${새메모.join('')}</w:comments>`);

  zip.file(주, 문서);
  zip.file(관계자리, 관계);
  zip.file(메모자리, 메모파일);
  zip.file('[Content_Types].xml', 종류);
  const 결과 = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  if (결과.length > 결과상한) return { 사유: '표시 사본이 한 파일 상한보다 크다' };

  // 올릴 파일 자체에서 비밀번호를 찾도록 글을 모아 준다 — XML 파트 전부(엔티티 풂) · 문단 글(조각을 이은 것)
  const 글들: string[] = 들.map((p) => p.글);
  // 조각을 잇는 것은 본문만이 아니다 — 머리글·바닥글·각주에서 갈린 글도 파트마다 `<w:t>` 를 이어 본다 (2026-09-26 검사)
  for (const [자리, f] of Object.entries(zip.files)) {
    if (f.dir || !/\.(xml|rels)$/i.test(자리)) continue;
    const xml = await f.async('string');
    글들.push(풀글(xml));
    글들.push([...xml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((t) => 풀글(t[1] ?? '')).join(''));
  }
  return { 바이트: 결과, 찾음, 글들 };
}
