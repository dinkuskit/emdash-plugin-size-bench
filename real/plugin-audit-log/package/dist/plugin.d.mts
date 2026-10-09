import * as emdash_plugin0 from "emdash/plugin";
import { PluginContext } from "emdash/plugin";
import * as _emdash_cms_plugin_types0 from "@emdash-cms/plugin-types";

//#region src/plugin.d.ts
declare const _default: {
  hooks: {
    "plugin:install": (_event: emdash_plugin0.LifecycleEvent, ctx: PluginContext<_emdash_cms_plugin_types0.PluginStorageConfig>) => Promise<void>;
    "plugin:activate": (_event: emdash_plugin0.LifecycleEvent, ctx: PluginContext<_emdash_cms_plugin_types0.PluginStorageConfig>) => Promise<void>;
    "plugin:deactivate": (_event: emdash_plugin0.LifecycleEvent, ctx: PluginContext<_emdash_cms_plugin_types0.PluginStorageConfig>) => Promise<void>;
    "plugin:uninstall": (_event: emdash_plugin0.UninstallEvent, ctx: PluginContext<_emdash_cms_plugin_types0.PluginStorageConfig>) => Promise<void>;
    "content:beforeSave": {
      handler: (event: emdash_plugin0.ContentHookEvent, ctx: PluginContext<_emdash_cms_plugin_types0.PluginStorageConfig>) => Promise<Record<string, unknown>>;
    };
    "content:afterSave": {
      handler: (event: emdash_plugin0.ContentHookEvent, ctx: PluginContext<_emdash_cms_plugin_types0.PluginStorageConfig>) => Promise<void>;
    };
    "content:beforeDelete": {
      handler: (event: emdash_plugin0.ContentDeleteEvent, ctx: PluginContext<_emdash_cms_plugin_types0.PluginStorageConfig>) => Promise<true>;
    };
    "content:afterDelete": {
      handler: (event: emdash_plugin0.ContentDeleteEvent, ctx: PluginContext<_emdash_cms_plugin_types0.PluginStorageConfig>) => Promise<void>;
    };
    "media:afterUpload": {
      handler: (event: emdash_plugin0.MediaAfterUploadEvent, ctx: PluginContext<_emdash_cms_plugin_types0.PluginStorageConfig>) => Promise<void>;
    };
  };
  routes: {
    admin: {
      handler: (routeCtx: Omit<emdash_plugin0.SandboxedRouteContext, "input"> & {
        input: unknown;
      }, ctx: PluginContext<_emdash_cms_plugin_types0.PluginStorageConfig>) => Promise<{
        blocks: ({
          type: string;
          text: string;
          blockId?: undefined;
          columns?: undefined;
          rows?: undefined;
          pageActionId?: undefined;
          nextCursor?: undefined;
          emptyText?: undefined;
        } | {
          type: string;
          text?: undefined;
          blockId?: undefined;
          columns?: undefined;
          rows?: undefined;
          pageActionId?: undefined;
          nextCursor?: undefined;
          emptyText?: undefined;
        } | {
          type: string;
          blockId: string;
          columns: {
            key: string;
            label: string;
            format: string;
          }[];
          rows: {
            action: "create" | "update" | "delete" | "media:upload" | "media:delete";
            resource: string;
            collection: string;
            time: string;
          }[];
          pageActionId: string;
          nextCursor: string | undefined;
          emptyText: string;
          text?: undefined;
        })[];
      } | {
        blocks: ({
          type: string;
          fields: {
            label: "create" | "update" | "delete" | "media:upload" | "media:delete";
            value: string;
          }[];
          text?: undefined;
        } | {
          type: string;
          text: string;
          fields?: undefined;
        })[];
      }>;
    };
    recent: {
      handler: (_routeCtx: Omit<emdash_plugin0.SandboxedRouteContext, "input"> & {
        input: unknown;
      }, ctx: PluginContext<_emdash_cms_plugin_types0.PluginStorageConfig>) => Promise<{
        entries: {
          timestamp: string;
          action: "create" | "update" | "delete" | "media:upload" | "media:delete";
          collection?: string;
          resourceId: string;
          resourceType: "content" | "media";
          userId?: string;
          changes?: {
            before?: Record<string, unknown>;
            after?: Record<string, unknown>;
          };
          metadata?: Record<string, unknown>;
          id: string;
        }[];
      }>;
    };
    history: {
      handler: (routeCtx: Omit<emdash_plugin0.SandboxedRouteContext, "input"> & {
        input: unknown;
      }, ctx: PluginContext<_emdash_cms_plugin_types0.PluginStorageConfig>) => Promise<{
        entries: {
          timestamp: string;
          action: "create" | "update" | "delete" | "media:upload" | "media:delete";
          collection?: string;
          resourceId: string;
          resourceType: "content" | "media";
          userId?: string;
          changes?: {
            before?: Record<string, unknown>;
            after?: Record<string, unknown>;
          };
          metadata?: Record<string, unknown>;
          id: string;
        }[];
        cursor: string | undefined;
        hasMore: boolean;
      }>;
    };
  };
};
//#endregion
export { _default as default };
//# sourceMappingURL=plugin.d.mts.map