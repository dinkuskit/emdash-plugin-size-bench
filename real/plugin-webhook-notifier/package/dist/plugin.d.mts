import * as emdash_plugin0 from "emdash/plugin";
import { PluginContext } from "emdash/plugin";
import * as _emdash_cms_plugin_types0 from "@emdash-cms/plugin-types";

//#region src/plugin.d.ts
interface WebhookPayload {
  event: string;
  timestamp: string;
  collection?: string;
  resourceId: string;
  resourceType: "content" | "media";
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
declare const _default: {
  hooks: {
    "content:afterSave": {
      priority: number;
      timeout: number;
      errorPolicy: "continue";
      handler: (event: emdash_plugin0.ContentHookEvent, ctx: PluginContext<_emdash_cms_plugin_types0.PluginStorageConfig>) => Promise<void>;
    };
    "content:afterDelete": {
      priority: number;
      timeout: number;
      errorPolicy: "continue";
      handler: (event: emdash_plugin0.ContentDeleteEvent, ctx: PluginContext<_emdash_cms_plugin_types0.PluginStorageConfig>) => Promise<void>;
    };
    "media:afterUpload": {
      priority: number;
      timeout: number;
      errorPolicy: "continue";
      handler: (event: emdash_plugin0.MediaAfterUploadEvent, ctx: PluginContext<_emdash_cms_plugin_types0.PluginStorageConfig>) => Promise<void>;
    };
  };
  routes: {
    admin: {
      handler: (routeCtx: Omit<emdash_plugin0.SandboxedRouteContext, "input"> & {
        input: unknown;
      }, ctx: PluginContext<_emdash_cms_plugin_types0.PluginStorageConfig>) => Promise<{
        blocks: unknown[];
      }>;
    };
    status: {
      handler: (_routeCtx: Omit<emdash_plugin0.SandboxedRouteContext, "input"> & {
        input: unknown;
      }, ctx: PluginContext<_emdash_cms_plugin_types0.PluginStorageConfig>) => Promise<{
        configured: boolean;
        enabled: boolean;
        stats: {
          successful: number;
          failed: number;
        };
      }>;
    };
    settings: {
      handler: (_routeCtx: Omit<emdash_plugin0.SandboxedRouteContext, "input"> & {
        input: unknown;
      }, ctx: PluginContext<_emdash_cms_plugin_types0.PluginStorageConfig>) => Promise<{
        webhookUrl: string;
        enabled: boolean;
        includeData: boolean;
        events: string;
      }>;
    };
    "settings/save": {
      handler: (routeCtx: Omit<emdash_plugin0.SandboxedRouteContext, "input"> & {
        input: unknown;
      }, ctx: PluginContext<_emdash_cms_plugin_types0.PluginStorageConfig>) => Promise<{
        success: boolean;
        error?: undefined;
      } | {
        success: boolean;
        error: string;
      }>;
    };
    test: {
      handler: (routeCtx: Omit<emdash_plugin0.SandboxedRouteContext, "input"> & {
        input: unknown;
      }, ctx: PluginContext<_emdash_cms_plugin_types0.PluginStorageConfig>) => Promise<{
        success: boolean;
        error: string;
        status?: undefined;
        payload?: undefined;
      } | {
        success: boolean;
        status: number | undefined;
        error: string | undefined;
        payload: WebhookPayload;
      }>;
    };
  };
};
//#endregion
export { _default as default };
//# sourceMappingURL=plugin.d.mts.map