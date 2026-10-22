// 설정 › 성능 에이전트 아래 「더미 클라이언트」 구획 — 게임 서버 부하에 쓸 실행 파일(zip) 목록 · 올리기 · 지우기 (도메인/성능 §8.14)

import { useState } from 'react';

import { ApiError } from './api.js';
import { use말, use언어 } from './i18n.js';
import { perfApi } from './perfApi.js';
import { message, useAsync, when } from './ui.js';

interface 앱줄 {
  id: number;
  prefix: string;
  name: string;
}

const 크기글자 = (bytes: number) => `${(bytes / 1_048_576).toFixed(1)} MB`;

export function SettingsPerfDummy({ services, 기본접두사, 관리자 }: { services: 앱줄[]; 기본접두사: string | undefined; 관리자: boolean }) {
  const t = use말();
  const 언어 = use언어();
  const [앱, set앱] = useState(() => String((services.find((s) => s.prefix === 기본접두사) ?? services[0])?.id ?? ''));
  const [이름, set이름] = useState('');
  const [명령, set명령] = useState('');
  const [파일, set파일] = useState<File | null>(null);
  // 올린 뒤 파일 칸을 비우려고 key 를 바꾼다 — 파일 input 은 값을 코드로 못 지운다
  const [판, set판] = useState(0);
  const [오류, set오류] = useState<string | null>(null);
  const [하는중, set하는중] = useState(false);
  const list = useAsync(() => (앱 === '' ? Promise.resolve({ clients: [] }) : perfApi.dummyClients(Number(앱))), [앱]);

  if (services.length === 0) return null;

  // 413 은 본문에 사유가 없을 수 있어 상태 코드로 가린다
  function 오류글(err: unknown): string {
    if (err instanceof ApiError && err.status === 413) return t('파일은 200MB 까지입니다');
    if (err instanceof ApiError && err.code === 'IN_USE') return t('이 더미 클라이언트를 쓰는 시나리오가 있어 지우지 못합니다');
    return message(err, 언어);
  }

  async function 해보기(일: () => Promise<unknown>, 끝?: () => void) {
    set오류(null);
    set하는중(true);
    try {
      await 일();
      끝?.();
      await list.reload();
    } catch (err) {
      set오류(오류글(err));
    } finally {
      set하는중(false);
    }
  }

  function 올리기() {
    if (이름.trim() === '' || 명령.trim() === '') {
      set오류(t('이름과 실행 명령을 적어 주세요'));
      return;
    }
    if (파일 === null) {
      set오류(t('올릴 .zip 파일을 골라 주세요'));
      return;
    }
    void 해보기(
      () => perfApi.addDummyClient(Number(앱), 이름.trim(), 명령.trim(), 파일),
      () => {
        set이름('');
        set명령('');
        set파일(null);
        set판((n) => n + 1);
      },
    );
  }

  const 클라이언트들 = list.data?.clients ?? [];
  return (
    <div className="set-card">
      <div className="set-card-h">
        <h3>{t('더미 클라이언트')}</h3>
        <p>{t('게임 서버 부하에 쓰는 리눅스 실행 파일입니다. 부하 발생 에이전트마다 한 번 띄우고 맡을 가상 사용자 수를 QAHUB_USERS 로 알려 줍니다')}</p>
      </div>
      <label className="perf-field">
        {t('애플리케이션')}
        <select value={앱} onChange={(e) => set앱(e.target.value)}>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      {list.error === null ? null : <p className="perf-err" role="alert">{message(list.error, 언어)}</p>}
      {list.data !== null && 클라이언트들.length === 0 ? (
        <div className="empty">{t('올린 더미 클라이언트가 없습니다')}</div>
      ) : (
        <div className="perf-table-box">
          <table className="perf-table">
            <thead>
              <tr>
                <th>{t('이름')}</th>
                <th>{t('실행 명령')}</th>
                <th>{t('크기')}</th>
                <th>{t('올린 날')}</th>
                {관리자 ? <th aria-label={t('삭제')} /> : null}
              </tr>
            </thead>
            <tbody>
              {클라이언트들.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td className="mono">{c.command}</td>
                  <td className="mono">{크기글자(c.bytes)}</td>
                  <td className="perf-faint">{when(c.createdAt, 언어)}</td>
                  {관리자 ? (
                    <td>
                      <button type="button" className="btn ghost small" disabled={하는중} aria-label={t('{이름} 삭제', { 이름: c.name })} onClick={() => void 해보기(() => perfApi.removeDummyClient(c.id))}>
                        {t('삭제')}
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {관리자 ? (
        <>
          <div className="perf-fields">
            <label className="perf-field">
              {t('더미 클라이언트 이름')}
              <input value={이름} maxLength={100} onChange={(e) => set이름(e.target.value)} />
            </label>
            <label className="perf-field">
              {t('실행 명령')}
              <input value={명령} placeholder="./bot" onChange={(e) => set명령(e.target.value)} />
            </label>
            <label className="perf-field">
              {t('zip 파일')}
              <input key={판} type="file" accept=".zip" onChange={(e) => set파일(e.target.files?.[0] ?? null)} />
            </label>
            <button type="button" className="btn" disabled={하는중} onClick={올리기}>
              {t('올리기')}
            </button>
          </div>
          <span className="perf-faint">
            {t('실행 파일은 요청이 끝날 때마다 표준 출력에 결과 한 줄을 써야 합니다')} <code>{'{"t":1730000000000,"tx":"login","ms":42,"ok":true}'}</code>
          </span>
        </>
      ) : null}
      {오류 === null ? null : <p className="perf-err" role="alert">{오류}</p>}
    </div>
  );
}
