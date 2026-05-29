# ========================================
# Action Item App - Vercel 部署腳本
# ========================================

Write-Host "=== 步驟 1: 檢查 Git 遠端 ===" -ForegroundColor Cyan
$remoteUrl = git remote get-url origin 2>$null
if ($remoteUrl) {
    Write-Host "✓ 遠端已設定：$remoteUrl" -ForegroundColor Green
} else {
    Write-Host "`n 請輸入你的 GitHub 用戶名：" -ForegroundColor Yellow
    $username = Read-Host "GitHub Username"
    git remote add origin "https://github.com/$username/action-item-app.git"
    Write-Host "✓ 已新增遠端" -ForegroundColor Green
}

Write-Host "`n=== 步驟 2: 推送程式碼到 GitHub ===" -ForegroundColor Cyan
git push -u origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ 推送成功！" -ForegroundColor Green
} else {
    Write-Host "⚠ 推送失敗，請先確認 GitHub repo 已建立" -ForegroundColor Yellow
    Write-Host "   請到 https://github.com/new 建立 repo 後再執行一次" -ForegroundColor Yellow
}

Write-Host "`n=== 步驟 3: 安裝依賴 ===" -ForegroundColor Cyan
npm install

Write-Host "`n=== 步驟 4: 建立 .env.local 檔案 ===" -ForegroundColor Cyan
$envContent = @"
TURSO_DATABASE_URL=請填入從 Turso 取得的 Database URL
TURSO_AUTH_TOKEN=請填入從 Turso 取得的 Auth Token
NEXTAUTH_SECRET=BwJsBmTyqyo0c0sTwRtIIMzjJp8iY8dlMlzPSAdBmfs=
NEXTAUTH_URL=http://localhost:3000
"@
$envContent | Out-File -FilePath ".env.local" -Encoding utf8
Write-Host "✓ .env.local 已建立" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "後續手動步驟：" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host @"

1. 到 https://turso.tech 建立免費資料庫
   - 註冊/登入
   - 點擊 Create Database
   - Name: action-item-app
   - Location: 選最近的 (如 Tokyo)
   - 建立後複製 Database URL 和 Auth Token
   - 填入 .env.local 中的 TURSO_DATABASE_URL 和 TURSO_AUTH_TOKEN

2. 推送資料庫結構到 Turso：
   npx drizzle-kit push

3. 到 https://vercel.com 部署
   - 用 GitHub 登入
   - Add New Project → Import Git Repository
   - 選擇 action-item-app
   - 設定環境變數：
     * TURSO_DATABASE_URL
     * TURSO_AUTH_TOKEN  
     * NEXTAUTH_SECRET = BwJsBmTyqyo0c0sTwRtIIMzjJp8iY8dlMlzPSAdBmfs=
   - 點擊 Deploy

完成後你的應用就會在 https://action-item-app.vercel.app 上線！

"@
