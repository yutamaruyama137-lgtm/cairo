export interface AICharacter {
  id: string;
  name: string;
  nameEn: string;       // "J", "A", "R", "V", "I", "S"
  department: string;
  role: string;
  color: string;
  lightColor: string;
  borderColor: string;
  textColor: string;
  gradientFrom: string;  // グラデーション用
  gradientTo: string;
  emoji: string;
  description: string;
  greeting: string;
}

export type InputType = "text" | "textarea" | "select";

export interface MenuInput {
  key: string;
  label: string;
  type: InputType;
  placeholder: string;
  required: boolean;
  options?: string[];
  helpText?: string;
}

export type MenuCategory =
  | "文書作成"
  | "分析・調査"
  | "コミュニケーション"
  | "相談・アドバイス"
  | "事務処理";

export interface MenuItem {
  id: string;
  characterId: string;
  title: string;
  description: string;
  icon: string;
  estimatedSeconds: number;
  humanMinutes: number;      // 人間が同じ作業をした場合の所要時間（分）
  category: MenuCategory;    // 能力カテゴリ（ダッシュボード集計用）
  inputs: MenuInput[];
  promptTemplate: string;
  outputLabel: string;
}

export interface ExecuteRequest {
  menuId: string;
  inputs: Record<string, string>;
}

export interface ExecuteResponse {
  success: boolean;
  output?: string;
  error?: string;
}
