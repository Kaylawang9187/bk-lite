import { AuthSourceTypeConfig } from '@/app/system-manager/types/security';

export const AUTH_SOURCE_TYPE_MAP: Record<string, AuthSourceTypeConfig> = {
  wechat: {
    icon: 'weixingongzhonghao',
    description: '支持微信平台扫码登录'
  }
};