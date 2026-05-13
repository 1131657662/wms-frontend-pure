/** 与后端 user_login_log.event_type 一致 */
export const LOGIN_LOG_EVENT = {
  LOGIN: "login",
  PASSWORD_CHANGE: "password_change",
  PROFILE_UPDATE: "profile_update",
  AVATAR_UPDATE: "avatar_update"
} as const;

export type LoginLogEventType =
  (typeof LOGIN_LOG_EVENT)[keyof typeof LOGIN_LOG_EVENT];

export const LOGIN_LOG_EVENT_LABEL: Record<LoginLogEventType, string> = {
  [LOGIN_LOG_EVENT.LOGIN]: "登录",
  [LOGIN_LOG_EVENT.PASSWORD_CHANGE]: "修改密码",
  [LOGIN_LOG_EVENT.PROFILE_UPDATE]: "个人资料",
  [LOGIN_LOG_EVENT.AVATAR_UPDATE]: "头像"
};
