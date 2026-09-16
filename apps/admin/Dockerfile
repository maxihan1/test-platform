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

EXPOSE 3000
CMD ["npx", "tsx", "apps/admin/src/app.ts"]
