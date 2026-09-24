import modulesConfig from "@/config/modules.json";

export type ErpModule = {
  key: string;
  name: string;
  icon?: string;
  targetUrl: string;
  /** If omitted, any authenticated user may access this module. */
  roles?: string[];
};

const modules = modulesConfig as ErpModule[];

export function getAllModules(): ErpModule[] {
  return modules;
}

export function getModule(key: string): ErpModule | undefined {
  return modules.find((m) => m.key === key);
}

export function getModulesForUser(allowedModules: string[]): ErpModule[] {
  return modules.filter((m) => allowedModules.includes(m.key));
}
