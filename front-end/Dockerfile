FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# 빌드 시 환경변수 명시적 설정
ENV VITE_API_BASE_URL=/api/v1

# 빌드 실행 및 권한 설정
CMD ["sh", "-c", "node node_modules/vite/bin/vite.js build && chmod -R 755 /app/build && chown -R 1000:1000 /app/build"]
