export interface DiscordServer {
  id: string;
  name: string;
  icon: string;
  memberCount: number;
  activeTickets: number;
  latency?: number;
  status: 'online' | 'offline' | 'lockdown';
  region?: string;
  tier?: 'Free' | 'Pro' | 'Enterprise';
}

export interface SecuritySetting {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'anti-nuke' | 'spam' | 'links' | 'compliance' | 'permission';
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface AuditLog {
  id: string;
  time: string;
  user: string;
  action: string;
  severity: 'low' | 'medium' | 'high';
  hash?: string; // For immutable audit trail verification
}

export interface Ticket {
  id: string;
  user: string;
  department: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'claimed' | 'closed';
  time: string;
  claimedBy?: string;
}

export interface LeaderboardUser {
  rank: number;
  username: string;
  level: number;
  xp: number;
  coins: number;
}

export interface ClusterShardNode {
  clusterId: string;
  shardId: number;
  status: 'healthy' | 'rebalancing' | 'offline';
  guildCount: number;
  ping: number;
  memoryUsageMB: number;
  cpuUsagePct: number;
}

export interface PluginItem {
  id: string;
  name: string;
  author: string;
  version: string;
  description: string;
  category: 'moderation' | 'ai' | 'utility' | 'fun' | 'analytics';
  installed: boolean;
  enabled: boolean;
  rating: number;
  downloads: number;
}

export interface LicenseKeyInfo {
  key: string;
  status: 'active' | 'expired' | 'revoked' | 'inactive';
  tier: 'Starter' | 'Pro' | 'Enterprise Ultra' | 'Standard';
  hwid: string;
  expiresAt: string;
  maxGuilds: number;
}

export interface WorkflowRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
  executionsToday: number;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  enabled: boolean;
  isBeta: boolean;
  description: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created: string;
  type: 'REST' | 'WebSocket' | 'GraphQL';
}

export interface BotStatusInfo {
  botUser: {
    username: string;
    tag: string;
    id: string;
    avatarUrl: string;
  } | null;
  botStatus: 'online' | 'offline' | 'connecting' | 'lockdown' | 'error';
  ping: number;
  guildCount: number;
  totalUsers: number;
  uptime: number;
  memory: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
  };
}

export interface SecurityStats {
  blockedAttacks: number;
  quarantinedUsers: number;
  backupCount: number;
  ipBansCount: number;
  verifiedIpsCount: number;
  securityScore: number;
  panicLockdownActive: boolean;
}

export interface EnvValidationResult {
  valid: boolean;
  missingRequired: string[];
  missingOptional: string[];
  warnings: string[];
}

