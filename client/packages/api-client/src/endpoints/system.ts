import { http } from '../http';

// --- Types (match backend system + health responses) ---

export interface HealthStatus {
  status: 'ok' | 'degraded';
  db?: 'up' | 'down';
}

/** Public site settings with the `public.` prefix stripped by the backend. */
export type PublicSettings = Record<string, unknown>;

export interface CurrentTerms {
  version: string;
}

export interface TermsAcceptance {
  termsVersion: string;
}

export const UPLOAD_PURPOSES = ['listingPhoto', 'avatar'] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

export const UPLOAD_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type UploadContentType = (typeof UPLOAD_CONTENT_TYPES)[number];

export interface CreateUploadInput {
  purpose: UploadPurpose;
  contentType: UploadContentType;
  sizeBytes: number;
}

export interface CreateUploadResult {
  s3ObjectId: string;
  bucket: string;
  key: string;
  uploadUrl: string;
  /** Form-post providers (Cloudinary) set these; a plain PUT ticket omits them. */
  method?: 'PUT' | 'POST';
  fields?: Record<string, string>;
  expiresInSeconds: number;
}

// --- Endpoints ---

export const systemApi = {
  /** Liveness/readiness probe (public). */
  health(): Promise<HealthStatus> {
    return http.get<HealthStatus>('/health', { auth: false });
  },

  /** Public site settings, e.g. matching radius (public). */
  publicSettings(): Promise<PublicSettings> {
    return http.get<PublicSettings>('/site-settings/public', { auth: false });
  },

  /** The current terms version to present at signup (public). */
  currentTerms(): Promise<CurrentTerms> {
    return http.get<CurrentTerms>('/terms/current', { auth: false });
  },

  /** Record that the signed-in user accepted the current terms. */
  acceptCurrentTerms(): Promise<TermsAcceptance> {
    return http.post<TermsAcceptance>('/terms/acceptances');
  },

  /** Request a presigned upload (step one of the two-step photo flow). */
  createUpload(input: CreateUploadInput): Promise<CreateUploadResult> {
    return http.post<CreateUploadResult>('/uploads', { json: input });
  },
};
