# 🚀 리워드 플랫폼 배포 가이드 (Vercel + Render + Supabase)

이 가이드는 모든 서비스를 **무료 티어**로 구성하여 배포하는 방법을 설명합니다. (Railway 대신 Render를 사용합니다.)

---

## 1. Git 및 GitHub 연결 (코드 올리기)

배포 서비스들은 GitHub의 코드를 가져와서 자동으로 배포합니다. 먼저 코드를 GitHub에 올려야 합니다.

1.  **GitHub 레포지토리 생성**: [github.com](https://github.com)에서 `New repository`를 클릭해 빈 저장소를 만듭니다. (이름 예: `reward-platform`)
2.  **로컬 코드 연결 및 푸시**:
    터미널(프로젝트 루트 폴더)에서 다음 명령어를 순서대로 입력합니다.

    ```bash
    # 1. Git 초기화 (이미 되어있다면 건너뜀)
    git init

    # 2. 모든 파일 추가
    git add .

    # 3. 첫 번째 커밋
    git commit -m "Initial commit: Ready for deployment"

    # 4. GitHub 연결 (나의 레포지토리 주소로 변경하세요)
    git remote add origin https://github.com/사용자이름/레포지토리이름.git

    # 5. 코드 업로드
    git branch -M main
    git push -u origin main
    ```

---

## 2. 데이터베이스 준비 (Supabase)

Railway의 유료화 대안으로 **Supabase**를 사용하여 PostgreSQL 데이터베이스를 무료로 생성합니다.

1.  **Supabase 프로젝트 생성**: [supabase.com](https://supabase.com) 가입 후 `New Project`를 만듭니다.
2.  **데이터베이스 주소 복사**:
    - `Project Settings` -> `Database` 메뉴로 이동합니다.
    - `Connection string` 항목에서 **URI** 탭을 클릭하고 주소를 복사합니다.
    - 비밀번호 부분(`[YOUR-PASSWORD]`)은 프로젝트 생성 시 설정한 비밀번호로 바꿉니다.
    - **중요**: 주소 끝에 `?pgbouncer=true`가 붙어 있는지 확인하세요. (Supabase 가이드 참조)

---

## 3. 백엔드 서버 및 DB 설정 (Render)

**Render**는 Railway의 훌륭한 무료 대안입니다.

1.  **Render 가입**: [render.com](https://render.com)에 GitHub 계정으로 가입합니다.
2.  **새 웹 서비스 생성**: `New +` -> `Web Service` 클릭 -> GitHub 레포지토리 연결.
3.  **서비스 상세 설정 (중요)**:
    - **Name**: `reward-server` (자유롭게 설정)
    - **Root Directory**: `server` (매우 중요)
    - **Runtime**: `Node`
    - **Build Command**: `npm install && npm run build`
    - **Start Command**: `npm run start`
4.  **환경 변수(Environment Variables) 설정**: `Advanced` 클릭 후 추가.
    - `DATABASE_URL`: 위에서 복사한 Supabase URI
    - `JWT_SECRET`: 아무 긴 문자열 (예: `my-super-secret-key-2026`)
    - `CORS_ORIGIN`: `https://내-프로젝트.vercel.app` (뒤에 나올 Vercel 주소)
5.  **배포 시작**: `Create Web Service` 클릭. (무료 서버는 생성에 1~3분 정도 걸립니다.)
6.  **서버 주소 확인**: 대시보드 상단에 있는 주소(예: `https://rewardpage.onrender.com`)를 복사해둡니다.

---

## 4. 프론트엔드 배포 (Vercel)

1.  **Vercel 프로젝트 생성**: [vercel.com](https://vercel.com) -> GitHub 레포지토리 연결.
2.  **설정**:
    - `Framework Preset`: `Vite`
    - `Root Directory`: `web`
3.  **환경 변수 추가**:
    - `VITE_API_URL`: 위에서 복사한 **Render 서버 주소**를 넣습니다.
4.  **배포**: `Deploy` 버튼 클릭.

---

## 5. 데이터베이스 테이블 생성 (Prisma)

코드를 올린 후 실제 데이터베이스에 테이블을 만들어야 합니다.

1.  **로컬 터미널에서 실행**:
    `server/.env` 파일의 `DATABASE_URL`이 실제 Supabase 주소인지 확인한 후, 다음 명령어를 실행합니다.

    ```bash
    cd server
    npx prisma db push

    # (선택) 초기 테스트 데이터가 필요하다면
    npx prisma db seed
    ```

---

## 🏁 최종 확인 리스트

- [ ] Vercel 페이지에 접속이 잘 되는가?
- [ ] 로그인 시 아이디: `admin@demo.local`, 비번: `demo1234`로 로그인이 되는가?
- [ ] **참고**: Render 무료 티어는 15분간 접속이 없으면 서버가 잠듭니다. 오랜만에 접속하면 첫 로딩이 30초 정도 걸릴 수 있습니다. (정상입니다!)

이제 모든 연결이 완료되었습니다! 본인의 컴퓨터를 꺼도 인터넷에서 리워드 플랫폼을 사용할 수 있습니다. 🎉
