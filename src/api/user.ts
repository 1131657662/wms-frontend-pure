import { http } from "@/utils/http";
import axios, { isAxiosError } from "axios";
import api from "@/api/wms";
import { parseBackendErrorMessage } from "@/utils/apiErrorMessage";

export type UserResult = {
  code: number;
  message: string;
  data: {
    /** 头像 */
    avatar: string;
    /** 用户名 */
    username: string;
    /** 昵称 */
    nickname: string;
    /** 当前登录用户的角色 */
    roles: Array<string>;
    /** 按钮级别权限 */
    permissions: Array<string>;
    /** `token` */
    accessToken: string;
    /** 用于调用刷新`accessToken`的接口时所需的`token` */
    refreshToken: string;
    /** `accessToken`的过期时间（格式'xxxx/xx/xx xx:xx:xx'） */
    expires: Date;
  };
};

export type RefreshTokenResult = {
  code: number;
  message: string;
  data: {
    /** `token` */
    accessToken: string;
    /** 用于调用刷新`accessToken`的接口时所需的`token` */
    refreshToken: string;
    /** `accessToken`的过期时间（格式'xxxx/xx/xx xx:xx:xx'） */
    expires: Date;
  };
};

export type UserInfo = {
  /** 头像 */
  avatar: string;
  /** 用户名 */
  username: string;
  /** 昵称 */
  nickname: string;
  /** 邮箱 */
  email: string;
  /** 联系电话 */
  phone: string;
  /** 简介 */
  description: string;
};

export type UserInfoResult = {
  code: number;
  message: string;
  data: UserInfo;
};

/** 登录——对接 WMS 后端 */
export const getLogin = async (data?: object) => {
  try {
    const res = await axios.post("/api/login", data);
    const d = res.data;
    if (d.code === 200) {
      // 将 WMS 响应转换为 pure-admin 格式
      const ui = d.data.userInfo || {};
      const expires = new Date();
      expires.setHours(expires.getHours() + 24); // 24小时过期
      return {
        code: 0,
        message: "success",
        data: {
          accessToken: d.data.token,
          refreshToken: d.data.token,
          expires,
          avatar: ui.avatar || "",
          username: ui.username || "",
          nickname: ui.nickname || ui.username || "",
          roles: ui.roleCode ? [ui.roleCode] : [],
          permissions: ui.permissions ?? []
        }
      };
    }
    throw new Error(d.message || "登录失败");
  } catch (err: unknown) {
    const msg = isAxiosError(err)
      ? parseBackendErrorMessage(err)
      : err instanceof Error
        ? err.message
        : "登录失败";
    throw new Error(msg);
  }
};

/** 刷新`token` */
export const refreshTokenApi = (data?: object) => {
  return http.request<RefreshTokenResult>("post", "/refresh-token", { data });
};

/** 账户设置-个人信息 */
export const getMine = async () => {
  const res = await api.get("/user/profile");
  return { code: 0, data: res.data };
};

/** 账户设置-安全日志行（user_login_log 聚合） */
export type SecurityLogRow = {
  id: number;
  eventType: string;
  summary: string;
  ip: string;
  address: string;
  system: string;
  browser: string;
  operatingTime: string;
};

export type WmsSecurityLogsPayload = {
  list: SecurityLogRow[];
  total: number;
  pageSize?: number;
  currentPage?: number;
};

/** 账户设置-个人安全日志（WMS 后端；拦截器已解包为 response.data） */
export const getSecurityLogsApi = (params?: {
  page?: number;
  pageSize?: number;
}) => {
  return api.get("/user/security-logs", { params }) as Promise<{
    code: number;
    message?: string;
    data: WmsSecurityLogsPayload;
  }>;
};

/** 账户设置-修改密码 */
export const changePassword = async (data: {
  oldPassword: string;
  newPassword: string;
}) => {
  const res = await api.post("/user/change-password", data);
  return res;
};
