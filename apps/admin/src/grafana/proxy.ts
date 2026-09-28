// /grafana/** 를 Grafana 컨테이너로 넘기고 로그인한 사람 아이디를 X-WEBAUTH-USER 로 싣는다 (SPEC 도메인/인증 §7 「Grafana 통로」)
// 누가 들어오는지는 앞의 문(auth/grafanaGate.ts)이 이미 정했다. 여기는 헤더만 정리한다

import httpProxy from '@fastify/http-proxy';
import type { FastifyInstance } from 'fastify';

// 플랫폼 출입증만 뺀다. grafana_session 같은 Grafana 자기 쿠키는 그대로 넘겨야 화면이 돈다
function 플랫폼쿠키뺌(cookie: string): string {
  return cookie
    .split(';')
    .map((조각) => 조각.trim())
    .filter((조각) => 조각 !== '' && !조각.startsWith('platform_session='))
    .join('; ');
}

export default async function grafanaProxy(app: FastifyInstance): Promise<void> {
  await app.register(httpProxy, {
    upstream: process.env.GRAFANA_URL ?? 'http://grafana:3000',
    prefix: '/grafana',
    // Grafana 가 하위 경로(/grafana/)에서 돈다. 접두사를 떼면 Grafana 가 만든 주소와 어긋난다
    rewritePrefix: '/grafana',
    // 실시간 연결은 끈다 — 켜면 연결마다 문을 따로 거쳐야 한다 (SPEC 도메인/인증 §7)
    websocket: false,
    replyOptions: {
      rewriteRequestHeaders: (req, headers) => {
        // Grafana 는 이 헤더를 믿는다. 요청이 실어 온 값·다른 로그인 수단은 지우고 서버가 새로 넣는다
        const { authorization: _a, 'x-webauth-user': _u, cookie, ...나머지 } = headers;
        const 쿠키 = typeof cookie === 'string' ? 플랫폼쿠키뺌(cookie) : '';
        return {
          ...나머지,
          ...(쿠키 === '' ? {} : { cookie: 쿠키 }),
          ...(req.user === null ? {} : { 'x-webauth-user': req.user.username }),
        };
      },
    },
  });
}
