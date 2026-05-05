import avatar1 from "@/assets/default-avatars/1.svg";
import avatar2 from "@/assets/default-avatars/2.svg";
import avatar3 from "@/assets/default-avatars/3.svg";
import avatar4 from "@/assets/default-avatars/4.svg";
import avatar5 from "@/assets/default-avatars/5.svg";
import avatar6 from "@/assets/default-avatars/6.svg";

const avatars = [avatar1, avatar2, avatar3, avatar4, avatar5, avatar6];

/** 根据字符串 hash 返回 1-6 范围内的默认头像编号 */
export function getDefaultAvatarNumber(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash) % 6;
}

/** 根据用户名返回对应的默认头像 SVG 资源 */
export function getDefaultAvatar(username: string): string {
  return avatars[getDefaultAvatarNumber(username)];
}
