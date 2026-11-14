// 프로젝트 QA 리포트 하나 보기 — 서버가 짓는 HTML 리포트를 화면 안에 싣고, 그 위에 다운로드 · 리스크 문장 수정을 둔다 (도메인/리포팅 §8.21 · 시안 QJUwEvAPXvUrRpwBCRibpq ④)
// 애플리케이션 리포트 보기(QaReport.tsx)와 같은 꼴이다 — 글은 서버 한 곳(reporting/qaProjectReportDoc.ts)이 짓는다. 승인 · 버전은 없다(§3.17 결정 14)

import { useState } from 'react';

import { 짧은날 } from '../reporting/qaProjectReportShape.js';
import type { User } from './api.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { 문서칸, 문장수정 } from './QaReport.js';
import { qaReportApi, 프로젝트파일주소, type 리포트형식 } from './qaReportApi.js';
import { 할수있나 } from './role.js';
import { Failed, Loading, useAsync, when } from './ui.js';

const 형식들: { 형식: 리포트형식; 이름: string }[] = [
  { 형식: 'PDF', 이름: 'PDF' },
  { 형식: 'DOCX', 이름: '워드' },
];

export function QaProjectReport({ id, user }: { id: number; user: User }) {
  const t = use말();
  const 언어 = use언어();
  const 리포트 = useAsync(() => qaReportApi.projectGet(id), [id]);
  // 문장 수정 뒤 문서를 다시 받는다 — key 가 바뀌면 iframe 이 새로 실린다
  const [판, set판] = useState(0);
  const 다시 = () => {
    void 리포트.reload();
    set판((n) => n + 1);
  };

  if (리포트.error !== null) return <Failed error={리포트.error} />;
  if (리포트.data === null) return <Loading />;
  const r = 리포트.data;
  // 권한은 프로젝트에 붙어 그 프로젝트 애플리케이션마다 같다 — 아무 애플리케이션 하나로 본다 (인증 §3.5)
  const 앱 = user.services.find((s) => s.projectId === r.projectId);
  const 쓰나 = 앱 !== undefined && 할수있나(user, 앱.prefix, '실행');

  return (
    <div className="qar qar-view">
      <Head
        위치={t('QA 리포트')}
        제목={t('{프로젝트} QA 리포트 · {시작} ~ {끝}', { 프로젝트: r.projectName, 시작: 짧은날(r.from), 끝: 짧은날(r.to) })}
        부제={
          <span className="qar-sub">
            {r.origin === 'SCHEDULED' ? t('자동') : t('직접 만듦 · {이름}', { 이름: r.createdBy })} · {t('{시각} 집계', { 시각: when(r.createdAt, 언어) })}
          </span>
        }
        행동={
          <details className="qar-down">
            <summary className="btn ghost">{t('다운로드')}</summary>
            <ul>
              {형식들.map((f) => (
                <li key={f.형식}>
                  <a href={프로젝트파일주소(r.id, f.형식)} target="_blank" rel="noreferrer">
                    {f.형식 === 'DOCX' ? t(f.이름) : f.이름}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        }
      />
      {쓰나 ? (
        <div className="qar-panel">
          <문장수정
            key={`${String(r.id)}:${String(판)}`}
            ai={r.ai}
            저장하기={(글) => qaReportApi.projectSaveAi(r.id, 글)}
            단추={t('리스크 문장 수정')}
            이름={t('지난 리포트 대비 리스크')}
            on바뀜={다시}
          />
        </div>
      ) : null}
      <문서칸 key={판} src={프로젝트파일주소(r.id, 'HTML')} />
    </div>
  );
}
