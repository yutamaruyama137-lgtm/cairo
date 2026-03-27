import Image from "next/image";

interface CharacterAvatarProps {
  characterId: string;
  name: string;
  size?: number;
  className?: string;
}

/**
 * キャラクターのSVGアバターを表示する
 * public/avatars/{characterId}.svg を参照
 *
 * 実写・イラスト写真に差し替えたい場合は
 * public/avatars/{characterId}.jpg (or .png .webp) を追加し
 * 下記 src のパスを変更するだけでOK
 */
export default function CharacterAvatar({
  characterId,
  name,
  size = 80,
  className = "",
}: CharacterAvatarProps) {
  return (
    <Image
      src={`/avatars/${characterId}.svg`}
      alt={`${name}のアバター`}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      priority
    />
  );
}
