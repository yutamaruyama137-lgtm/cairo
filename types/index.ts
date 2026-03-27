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

export interface MenuItem {
  id: string;
  characterId: string;
  title: string;
  description: string;
  icon: string;
  estimatedSeconds: number;
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
