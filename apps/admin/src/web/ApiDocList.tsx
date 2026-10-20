// 「API 문서」의 전체 API 목록 — 현재 버전의 API 마다 한 줄, 응답 코드마다 ●(통과한 케이스가 받음) ○(아직 안 받음) (도메인/API §8.13)

import { useState } from 'react';

import type { ApiCoverage, OpenApiDoc } from './apiDocApi.js';
import { API묶기 } from './apidocView.js';
import { use말 } from './i18n.js';

export function ApiDocList({ coverage, doc }: { coverage: ApiCoverage; doc: OpenApiDoc | null }) {
  const t = use말();
  const [찾는말, set찾는말] = useState('');
  const 묶음들 = API묶기(coverage, doc, 찾는말);
  return (
    <section className="screen" aria-labelledby="api-all-title">
      <div className="toolbar">
        <h2 id="api-all-title" className="prd-all-title">
          {t('전체 API')}
        </h2>
        <span className="note">{t('확인한 응답 {덮음}/{전체}', { 덮음: coverage.covered, 전체: coverage.total })}</span>
        <input
          type="text"
          className="prd-find"
          value={찾는말}
          onChange={(e) => set찾는말(e.target.value)}
          aria-label={t('API 경로 · 이름 검색')}
          placeholder={t('API 경로 · 이름 검색')}
        />
      </div>
      {묶음들.length === 0 ? (
        <div className="empty">{찾는말 === '' ? t('문서에 API 가 없습니다') : t('찾는 API 가 없습니다')}</div>
      ) : (
        <div className="prd-vscroll">
          <table className="prd-vtable api-table">
            <thead>
              <tr>
                <th>{t('API')}</th>
                <th>{t('이름')}</th>
                <th>{t('응답 코드')}</th>
              </tr>
            </thead>
            {묶음들.map((g) => {
              const 안거친 = g.줄들.flatMap((x) => x.codes).filter((c) => !c.seen).length;
              return (
                <tbody key={g.태그 ?? ''}>
                  <tr className="api-group">
                    <td colSpan={3}>
                      {g.태그 ?? t('태그 없음')}
                      <span>
                        {t('{건수}개', { 건수: g.줄들.length })}
                        {안거친 === 0 ? null : <> · {t('안 거친 응답 {건수}개', { 건수: 안거친 })}</>}
                      </span>
                    </td>
                  </tr>
                  {g.줄들.map((x) => (
                    <tr key={`${x.method} ${x.path}`}>
                      <td>
                        <span className="prd-api-m">{x.method}</span> <span className="prd-id">{x.path}</span>
                      </td>
                      <td>{x.이름 ?? ''}</td>
                      <td>
                        <span className="api-codes">
                          {x.codes.map((c) => (
                            <span key={c.status} className={c.seen ? 'api-code seen' : 'api-code'} aria-label={c.seen ? t('{코드} 확인함', { 코드: c.status }) : t('{코드} 아직 안 받음', { 코드: c.status })}>
                              <span aria-hidden="true">{c.seen ? '●' : '○'}</span>
                              {c.status}
                              {c.noShape ? <span className="api-noshape">{t('응답 형식 없음')}</span> : null}
                            </span>
                          ))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              );
            })}
          </table>
        </div>
      )}
      <p className="hint">{t('● 통과한 케이스가 받은 응답 · ○ 아직 안 받은 응답 · 「응답 형식 없음」 문서에 응답 형식이 적혀 있지 않은 코드')}</p>
    </section>
  );
}
