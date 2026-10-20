// 서비스 가이드 구획 하나 — 글 칸 · 첨부 줄 · 파일 첨부 · 열기 (도메인/작성 §3.6 「★ 서비스 가이드」 · 2026-10-17 시안 A)
// 변경 기록의 옛 판도 이 조각으로 읽기 전용으로 그린다 — 고치는 손잡이(on글 · on더하기 · on빼기)를 안 넘기면 읽기 전용이다

import { useRef, useState } from 'react';

import type { GuideFile, GuideSection as 구획 } from '@platform/kit';

// 고르개와 보내기 전 거르기(Guide.tsx 의 거절사유)가 같은 목록을 본다 — 자료 올리기와 같은 규칙 (도메인/작성 §7 「자료」)
import { 받는종류 } from './AuthoringNew.js';
import { guideApi } from './guideApi.js';
import { use말, use언어 } from './i18n.js';
import { message, when } from './ui.js';

export const 구획들: 구획[] = ['intro', 'policy', 'rules'];
export const 구획이름: Record<구획, string> = { intro: '애플리케이션 소개', policy: '정책', rules: '작업 규칙' };

const 확장자 = (이름: string) => 이름.slice(이름.lastIndexOf('.') + 1).toLowerCase();

export function 크기글(바이트: number): string {
  if (바이트 < 1024) return `${바이트}B`;
  if (바이트 < 1024 * 1024) return `${Math.round(바이트 / 1024)}KB`;
  return `${(바이트 / 1024 / 1024).toFixed(1)}MB`;
}

/** 연 파일의 글. PDF 는 여기 안 온다 — 브라우저가 새 탭에서 연다 (§3.6 「열기」) */
type 연글 = { id: number; text: string | null; 오류: string | null };

export function GuideSection({
  service,
  section,
  글,
  files,
  on글,
  on더하기,
  on빼기,
  busy = false,
}: {
  service: string;
  section: 구획;
  글: string;
  files: GuideFile[];
  on글?: (글: string) => void;
  on더하기?: (file: File) => void;
  on빼기?: (file: GuideFile) => void;
  busy?: boolean;
}) {
  const t = use말();
  const 언어 = use언어();
  const 고르개 = useRef<HTMLInputElement>(null);
  const [연, set연] = useState<연글 | null>(null);
  // 빼도 옛 버전에서 열리지만 되돌리기가 없다 — 눌렀을 때 그 자리에서 한 번 더 묻는다 (점검 9.2)
  const [뺄파일, set뺄파일] = useState<number | null>(null);
  const 제목 = t(구획이름[section]);
  const 제목id = `guide-${section}`;

  async function 열기(file: GuideFile) {
    if (연?.id === file.id) return set연(null);
    set연({ id: file.id, text: null, 오류: null });
    try {
      const { text } = await guideApi.text(service, file.id);
      set연({ id: file.id, text, 오류: null });
    } catch (err) {
      set연({ id: file.id, text: null, 오류: message(err, 언어) });
    }
  }

  return (
    <section className="screen guide-sec" aria-labelledby={제목id}>
      <h2 id={제목id} className="guide-title">
        {제목}
      </h2>
      {on글 === undefined ? (
        글 === '' ? (
          <p className="guide-empty">{t('적은 글이 없습니다')}</p>
        ) : (
          <pre className="guide-text">{글}</pre>
        )
      ) : (
        <textarea
          className="guide-input"
          aria-label={제목}
          rows={Math.max(4, 글.split('\n').length + 1)}
          value={글}
          placeholder={t('문서에 없는 것만 적습니다')}
          onChange={(e) => on글(e.target.value)}
        />
      )}
      {files.length === 0 ? null : (
        <ul className="guide-files">
          {files.map((file) => {
            const 종류 = 확장자(file.name);
            return (
              <li key={file.id}>
                <div className="guide-file">
                  <span className="guide-kind">{종류.toUpperCase()}</span>
                  {/* 이름을 누르면 내려받는다 — 열 수 없는 .doc 도 이 길로 본다 */}
                  <a className="guide-name" href={guideApi.fileUrl(service, file.id)} download>
                    {file.name}
                  </a>
                  <span className="guide-meta">
                    {크기글(file.size)} · {when(file.uploadedAt, 언어)}
                  </span>
                  {종류 === 'pdf' ? (
                    <a className="btn ghost small" href={guideApi.pdfUrl(service, file.id)} target="_blank" rel="noopener noreferrer">
                      {t('열기')}
                    </a>
                  ) : 종류 === 'doc' ? null : (
                    <button className="btn ghost small" aria-expanded={연?.id === file.id} onClick={() => void 열기(file)}>
                      {연?.id === file.id ? t('닫기') : t('열기')}
                    </button>
                  )}
                  {on빼기 === undefined ? null : 뺄파일 === file.id ? (
                    <>
                      <button
                        className="btn ghost small set-warn"
                        disabled={busy}
                        aria-label={t('{이름} 제거 확인', { 이름: file.name })}
                        onClick={() => {
                          set뺄파일(null);
                          on빼기(file);
                        }}
                      >
                        {t('제거 확인')}
                      </button>
                      <button className="btn ghost small" onClick={() => set뺄파일(null)}>
                        {t('취소')}
                      </button>
                    </>
                  ) : (
                    <button className="btn ghost small" disabled={busy} aria-label={t('{이름} 제거', { 이름: file.name })} onClick={() => set뺄파일(file.id)}>
                      {t('제거')}
                    </button>
                  )}
                </div>
                {연?.id !== file.id ? null : 연.오류 !== null ? (
                  <p className="prd-note bad">{연.오류}</p>
                ) : 연.text === null ? (
                  <p className="prd-note">{t('불러오는 중입니다')}</p>
                ) : (
                  <pre className="guide-text guide-open">{연.text}</pre>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {on더하기 === undefined ? null : (
        <div>
          <button className="btn ghost small" disabled={busy} onClick={() => 고르개.current?.click()}>
            {t('파일 첨부')}
          </button>
          <input
            ref={고르개}
            type="file"
            hidden
            accept={받는종류}
            aria-label={t('{구획}에 파일 첨부', { 구획: 제목 })}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file !== undefined) on더하기(file);
            }}
          />
        </div>
      )}
    </section>
  );
}
