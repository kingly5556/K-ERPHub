import modulesConfig from "@/config/modules.json";

export type ErpModule = {
  key: string;
  name: string;
  icon?: string;
  targetUrl: string;
  /** If omitted, any authenticated user may access this module. */
  roles?: string[];
};

// In production each module's real backend URL comes from MODULE_<KEY>_URL
// (e.g. MODULE_STOCK_URL=https://k-erp-stock.onrender.com). modules.json keeps the
// localhost URLs used for local development, so nothing changes when the env is unset.
function resolveTargetUrl(m: ErpModule): ErpModule {
  const envKey = `MODULE_${m.key.toUpperCase()}_URL`;
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return { ...m, targetUrl: fromEnv.replace(/\/+$/, "") };
  if (process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/.test(m.targetUrl)) {
    console.warn(`[registry] ${envKey} is not set; module "${m.key}" still points to ${m.targetUrl}`);
  }
  return m;
}

const modules = (modulesConfig as ErpModule[]).map(resolveTargetUrl);

export function getAllModules(): ErpModule[] {
  return modules;
}

export function getModule(key: string): ErpModule | undefined {
  return modules.find((m) => m.key === key);
}

export function getModulesForUser(allowedModules: string[]): ErpModule[] {
  return modules.filter((m) => allowedModules.includes(m.key));
}
