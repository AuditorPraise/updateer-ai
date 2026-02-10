
export type EmailType = 'Newsletter' | 'Welcome Message' | 'Product Advertisement' | 'Transactional';

export interface EmailMetadata {
  subjectLine: string;
  category: string;
  estimatedReadTime: number;
}

export interface GeneratedEmail {
  html: string;
  reactCode: string;
  metadata: EmailMetadata;
}

export interface SavedEmail {
  id: string;
  name: string;
  html: string;
  createdAt: string;
}

export interface GenerationState {
  loading: boolean;
  error: string | null;
  data: GeneratedEmail | null;
}

export interface EmailConfig {
  type: EmailType;
  brandName: string;
  brandDescription: string; // Added for brand context
  logoUrl: string;
  ctaUrl: string;
  ctaLabel: string;
  facebookUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
  // Advanced Marketing Fields
  primaryGoal: string;
  audienceProfile: string;
  brandVoice: string;
  mustHaves: string;
  designStyle: string;
  context: string;
  productImageUrl?: string; // Deprecated
  productImages?: { id: string; url: string; name: string }[];
}

export interface UserProfile {
  id?: string;
  email: string;
  brandName: string;
  brandDescription: string; // Added for brand context
  logoUrl: string;
  facebookUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
  credits: number;
  campaignCredits: number;
  subscriptionTier: 'Free' | 'Pro' | 'Starter' | 'Bulk' | 'Agency';
  isSubscribed?: boolean;
  subscriptionExpiresAt?: string;
}

export interface Contact {
  id: string;
  email: string;
  name?: string;
  tag?: string;
  createdAt: string;
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  credits: number;
  campaigns: number;
  description: string;
  isMonthly: boolean;
}

export interface AnalyticsSummary {
  name: string;
  value: number;
  color?: string;
}

export interface CampaignPerformance {
  date: string;
  opens: number;
  clicks: number;
  unsubscribes: number;
}

export interface UserDomain {
  id: number;
  domainName: string;
  resendDomainId: string;
  status: string;
  dnsRecords: string;
  region: string;
  hasTracking: boolean;
  createdAt: string;
}

export interface DNSRecord {
  record_type?: string;
  type?: string;
  name: string;
  value: string;
  ttl?: string;
  priority?: number;
  status?: string;
}
