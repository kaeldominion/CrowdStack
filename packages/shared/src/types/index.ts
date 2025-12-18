// Shared types across the application

export type AppEnvironment = "local" | "beta" | "prod";

export interface AppConfig {
  env: AppEnvironment;
  version: string;
  supabaseUrl: string;
  webUrl: string;
  appUrl: string;
}

export interface HealthCheckResult {
  status: "ok" | "error";
  message: string;
  timestamp: string;
  supabaseConnected: boolean;
}

