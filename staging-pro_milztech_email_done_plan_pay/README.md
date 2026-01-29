
# StagingPro - プロフェッショナル運用マニュアル

## 💳 Stripe決済の導入手順（ハワイ・アメリカ展開用）

決済を有効にするには、Cloudflare Pagesの管理画面でAPIキーを設定する必要があります。

### STEP 1: Stripeキーの取得
1. [Stripe Dashboard](https://dashboard.stripe.com) にログイン。
2. 開発用（テスト）の場合は `Developers` > `API keys` から以下を取得：
   - `Publishable key` (pk_test_...)
   - `Secret key` (sk_test_...)
3. 本番運用の場合は、Stripeの審査完了後に発行される `pk_live_...` と `sk_live_...` を使用します。

### STEP 2: Cloudflare Pagesでの設定
1. Cloudflare Pagesのプロジェクト設定を開く。
2. `Settings` > `Environment variables` (または `Functions`) を開く。
3. 以下の変数を追加：
   - `STRIPE_SECRET_KEY`: Stripeの **Secret key** を入力。
   - `VITE_STRIPE_PUBLISHABLE_KEY`: Stripeの **Publishable key** を入力。
4. **重要**: 設定後、アプリを再デプロイしてください。

---

## 🌐 独自ドメイン（お名前.com）の設定手順

1. Cloudflare Pagesの `Custom domains` でドメインを入力。
2. 表示されるネームサーバーをお名前.comの管理画面に設定。
3. 反映後、Supabaseの `Site URL` を新しいドメインに変更。

---

## 📧 メール通知の設定 (Resend)
1. `VITE_RESEND_API_KEY` をCloudflareの環境変数に設定。
2. Resendで `info@milz.tech` のドメイン認証を完了させる。
