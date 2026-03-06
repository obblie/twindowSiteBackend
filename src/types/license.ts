export type LicenseStatus = "active" | "inactive" | "invalid";

export type LicenseSnapshot = {
  status: LicenseStatus;
  instanceId: string | null;
  entitlements: {
    premium: boolean;
  };
  nextCheckAt: string;
};

export type ApiSuccess = {
  ok: true;
  license: LicenseSnapshot;
  error: null;
};

export type ApiFailure = {
  ok: false;
  license: null;
  error: {
    code: "INVALID_LICENSE" | "ACTIVATION_FAILED" | "UPSTREAM_UNAVAILABLE" | "BAD_REQUEST";
    message: string;
  };
};

export type ApiResponse = ApiSuccess | ApiFailure;

