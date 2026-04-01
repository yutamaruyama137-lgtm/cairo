/**
 * lib/db/index.ts
 *
 * データアクセス抽象化レイヤーのエントリーポイント。
 *
 * Phase 1（現在）: data/ から静的データを取得
 * Phase 2以降:     Supabase から取得
 *
 * 呼び出し側はここだけをimportすればいい。
 * 実装の切り替えはここで吸収する。
 */

// テナント操作
export * from "./tenants";

// メニュー操作（Phase 2で data/menus.ts から移行）
// export * from "./menus";

// タスク操作（Phase 2で実装）
// export * from "./tasks";
