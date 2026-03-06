export type LicenseStatusResponse = {
  active: boolean;
  tier: "premium" | "free";
  instanceID: string | null;
  expiresAt: string | null;
  message: string | null;
};

export type LicenseDeactivateResponse = {
  deactivated: boolean;
  message: string | null;
};

export type MessageFailureResponse = {
  message: string;
};

