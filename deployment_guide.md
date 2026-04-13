# 🚀 리워드 플랫폼 배포 가이드 (Git, Railway, Vercel)

이 가이드는 로컬 프로젝트를 **GitHub**에 업로드하고, **Railway**(백엔드/DB)와 **Vercel**(프론트엔드)을 통해 실제 서비스로 배포하는 전 과정을 담고 있습니다.

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

## 2. 백엔드 및 데이터베이스 배포 (Railway)

**Railway**는 서버와 DB를 한 번에 관리하기에 최적입니다.

1.  **프로젝트 생성**: [railway.app](https://railway.app) 접속 -> `New Project` -> `GitHub Repo` 선택 -> 생성한 레포지토리 연결.
2.  **PostgreSQL 데이터베이스 추가**:
    - 프로젝트 대시보드에서 `+ New` -> `Database` -> `Add PostgreSQL` 클릭.
3.  **서버 서비스 설정 (중요)**:
    - GitHub에서 가져온 서비스 카드를 클릭합니다.
    - **Settings** 탭: `Root Directory`를 `/server`로 설정합니다. (그래야 백엔드 코드만 찾아 배포함)
    - **Variables** 탭: `Add Variable`을 통해 다음을 추가합니다.
      - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}` (자동 완성됨)
      - `JWT_SECRET`: 당신만의 비밀 키 (예: `long-secret-key-123!`)
      - `CORS_ORIGIN`: `https://내-프론트엔드-이름.vercel.app` (뒤에 나올 Vercel 주소)
      - `PORT`: `8080` (Railway 기본값)
4.  **배포 확인**: `Deployments` 탭에서 성공을 확인하고, `Settings` -> `Public Networking` -> `Generate Domain`을 눌러 서버 주소를 만듭니다.

---

## 3. 프론트엔드 배포 (Vercel)

**Vercel**은 프론트엔드 성능이 매우 뛰어나며 설정이 간단합니다.

1.  **프로젝트 임포트**: [vercel.com](https://vercel.com) 접속 -> `Add New` -> `Project` -> GitHub 레포지토리 선택.
2.  **프로젝트 설정 (Configure Project)**:
    - `Framework Preset`: `Vite` (자동 감지됨)
    - `Root Directory`: `web` 클릭 후 `Select` 선택.
3.  **환경 변수 설정**: `Environment Variables` 항목을 펼치고 다음을 추가합니다.
    - `VITE_API_URL`: 위에서 생성한 **Railway 서버 주소** (예: `https://xxxx.up.railway.app`)
4.  **배포 진행**: `Deploy` 버튼 클릭. 완료 시 생성된 URL이 실제 웹사이트 주소입니다.

---

## 4. 데이터베이스 테이블 생성 (Prisma)

코드는 올라갔지만 클라우드 DB에는 아직 테이블(Schema)이 없습니다.

1.  **Railway CLI 설치 (추천)**: `npm i -g @railway/cli`
2.  **명령어 실행**:
    ```bash
    cd server
    railway login
    railway link  # 배포한 프로젝트 선택
    railway run npx prisma db push
    ```
    _또는 Railway 대시보드의 `DATABASE_URL`을 잠시 복사해와서 로컬 `.env`에 넣고 `npx prisma db push`를 직접 실행해도 됩니다._

---

## 🏁 최종 확인 리스트

- [ ] 브라우저에서 Vercel 주소로 접속이 되는가?
- [ ] 로그인/회원가입 시 "서버 연결 오류"가 아니라 정상 응답이 오는가?
- [ ] (오류 발생 시) Railway 대시보드의 `Logs` 탭을 확인하여 어떤 에러가 찍히는지 확인하세요.

이제 전 세계 어디서든 링크만 있으면 당신의 플랫폼을 사용할 수 있습니다! 🎉
