# admin 컨테이너. 증적 PDF를 page.pdf()로 직접 뽑으므로 여기도 Playwright 공식 이미지가 필요하다 (SPEC §3.3)
FROM mcr.microsoft.com/playwright:v1.63.0-jammy

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/kit/package.json packages/kit/
COPY apps/admin/package.json apps/admin/
COPY apps/runner/package.json apps/runner/
RUN npm ci

# 스캐너가 /tests의 파일을 동적 import 한다. 읽기 전용이라 그 안에 node_modules를 둘 수 없으므로
# 루트에 링크를 걸어 /tests 밖에서 모듈이 resolve 되게 한다 (SPEC §3.1, §9)
RUN ln -s /app/node_modules /node_modules

COPY tsconfig.json playwright.config.ts ./
COPY packages ./packages
COPY apps/admin ./apps/admin

# 첫 계정·첫 서비스·정기 실행은 컨테이너 안 명령으로 만든다 (SPEC §9.2).
# 이게 없으면 SETUP.md 가 안내하는 첫걸음이 ERR_MODULE_NOT_FOUND 로 죽고,
# 회원가입 화면이 없으므로(§8.6) 처음 띄우는 사람은 로그인 자체를 못 한다.
# scripts 는 ../apps/admin/src/** 를 상대경로로 부르므로 **그 둘이 같은 이미지에 있어야 한다**
# (순서는 상관없다 — 해석은 실행할 때 일어난다)
COPY scripts ./scripts

# .dockerignore가 **/dist를 막아 호스트에서 빌드한 산출물은 이미지에 안 들어온다.
# 이 단계가 없으면 컨테이너는 API만 내고 화면 주소는 빈 화면이다 (SPEC §9).
# 글꼴도 번들에 담겨 여기서 같이 실린다 — 바깥 주소에서 받아오지 않는다 (DESIGN.md)
#
# 「그래프 ↗」 자리의 Grafana 포트도 여기서 번들에 구워진다 (SPEC §9.2).
# compose 의 build args 가 이 ARG 를 채우고, ENV 로 올려야 vite 가 그 값을 본다 —
# Vite 는 `VITE_` 로 시작하는 환경변수만 번들에 넣는다.
# 실행 시점 환경변수로는 못 바꾼다. 포트를 바꾸면 이 이미지를 다시 빌드해야 한다
ARG VITE_GRAFANA_PORT=3001
ENV VITE_GRAFANA_PORT=$VITE_GRAFANA_PORT
RUN npx vite build --config apps/admin/src/web/vite.config.ts

EXPOSE 3000
CMD ["npx", "tsx", "apps/admin/src/app.ts"]
