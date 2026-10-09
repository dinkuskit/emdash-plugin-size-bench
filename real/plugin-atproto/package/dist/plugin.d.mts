import * as emdash_plugin0 from "emdash/plugin";
import { PluginContext } from "emdash/plugin";
import * as emdash from "emdash";

//#region src/plugin.d.ts
declare const _default: {
  hooks: {
    "plugin:install": (_event: unknown, ctx: PluginContext) => Promise<void>;
    "content:afterSave": {
      handler: (event: {
        content: Record<string, unknown>;
        collection: string;
        isNew: boolean;
      }, ctx: PluginContext) => Promise<void>;
    };
    "content:afterPublish": {
      handler: (event: {
        content: Record<string, unknown>;
        collection: string;
      }, ctx: PluginContext) => Promise<void>;
    };
    "content:afterDelete": {
      handler: (event: {
        id: string;
        collection: string;
      }, ctx: PluginContext) => Promise<void>;
    };
    "page:metadata": (event: {
      page: {
        content?: {
          collection: string;
          id: string;
        };
      };
    }, ctx: PluginContext) => Promise<{
      kind: "link";
      rel: "site.standard.document";
      href: string;
      key: string;
    } | null>;
  };
  routes: {
    status: {
      handler: (_routeCtx: unknown, ctx: PluginContext) => Promise<{
        configured: boolean;
        connected: boolean;
        handle: string | null;
        did: string | null;
        publicationUri: string | null;
        stats: {
          synced: number;
          errors: number;
          pending: number;
        };
      }>;
    };
    "test-connection": {
      handler: (_routeCtx: unknown, ctx: PluginContext) => Promise<{
        success: boolean;
        did: string;
        pdsHost: string;
        error?: undefined;
      } | {
        success: boolean;
        error: string;
        did?: undefined;
        pdsHost?: undefined;
      }>;
    };
    "sync-publication": {
      handler: (_routeCtx: unknown, ctx: PluginContext) => Promise<{
        success: boolean;
        error: string;
        uri?: undefined;
        cid?: undefined;
      } | {
        success: boolean;
        uri: string;
        cid: string;
        error?: undefined;
      }>;
    };
    "recent-syncs": {
      handler: (_routeCtx: unknown, ctx: PluginContext) => Promise<{
        items: {
          collection: string;
          contentId: string;
          atUri: string;
          atCid: string;
          bskyPostUri?: string;
          bskyPostCid?: string;
          publishedAt: string;
          lastSyncedAt: string;
          status: "synced" | "error" | "pending";
          errorMessage?: string;
          retryCount?: number;
          id: string;
        }[];
      }>;
    };
    verification: {
      handler: (_routeCtx: unknown, ctx: PluginContext) => Promise<{
        publicationUri: string | null;
        siteUrl: string | null;
        wellKnownPath: string;
        wellKnownContent: string;
      }>;
    };
    admin: {
      handler: (routeCtx: Omit<emdash_plugin0.SandboxedRouteContext, "input"> & {
        input: unknown;
      }, ctx: PluginContext<emdash.PluginStorageConfig>) => Promise<{
        blocks: unknown[];
      }>;
    };
  };
};
//#endregion
export { _default as default };
//# sourceMappingURL=plugin.d.mts.map