import {
  ChannelType,
  GuildMember,
  MessageFlags,
  TextChannel,
  EmbedBuilder
} from "discord.js";

// ==================== UTILITY FUNCTIONS ====================

export function getAppBaseUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.PUBLIC_APP_URL) return process.env.PUBLIC_APP_URL;
  if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL;
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}`;
}

export function sanitizeInput(input: string, maxLength: number = 2000): string {
  if (!input || typeof input !== "string") return "";
  let clean = input.normalize("NFKC");
  clean = clean.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A\u202B\u202C\u202D\u202E\u2066\u2067\u2068\u2069\u061C\uFEFF]/gu, "");
  clean = clean.replace(/(--|;|\/\*|\*\/|<script.*?>|<\/script>)/gi, "");
  clean = clean.replace(/[\u0300-\u036F\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]{3,}/gu, "");
  clean = clean.replace(/(https?:\/\/)?(www\.)?(discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9]+/gi, "[INVITE-REMOVED]");
  return clean.trim().slice(0, maxLength);
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 10000, fallbackMessage: string = "Operation timed out"): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(fallbackMessage)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

export async function withExponentialBackoff<T>(operation: () => Promise<T>, maxRetries: number = 4, initialDelay: number = 1000): Promise<T> {
  let delay = initialDelay;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err: any) {
      const isRateLimit = err?.status === 429 || err?.code === 429 || err?.message?.includes("429") || err?.message?.includes("rate limit");
      const retryAfter = err?.retryAfter || (err?.rawError?.retry_after ? err.rawError.retry_after * 1000 : null) || delay;
      if (isRateLimit && attempt < maxRetries) {
        console.warn(`⏳ Rate Limit Hit (429). Retrying in ${retryAfter}ms (Attempt ${attempt}/${maxRetries})...`);
        await new Promise(res => setTimeout(res, retryAfter));
        delay *= 2;
      } else {
        throw err;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

export function createSafeEmbed(data: {
  title?: string;
  description?: string;
  color?: number;
  thumbnail?: string | null;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string; iconURL?: string };
  author?: { name: string; iconURL?: string };
}): EmbedBuilder {
  const embed = new EmbedBuilder();
  if (data.title) embed.setTitle(sanitizeInput(data.title, 250));
  if (data.description) embed.setDescription(sanitizeInput(data.description, 3900));
  if (data.color !== undefined) embed.setColor(data.color);
  if (data.thumbnail) embed.setThumbnail(data.thumbnail);
  if (data.footer?.text) embed.setFooter({ text: sanitizeInput(data.footer.text, 200), iconURL: data.footer.iconURL });
  if (data.author?.name) embed.setAuthor({ name: sanitizeInput(data.author.name, 250), iconURL: data.author.iconURL });

  if (data.fields && Array.isArray(data.fields)) {
    const safeFields = data.fields.slice(0, 24).map(f => ({
      name: sanitizeInput(f.name || "Field", 250) || "Field",
      value: sanitizeInput(f.value || "N/A", 1020) || "N/A",
      inline: !!f.inline
    }));
    embed.addFields(safeFields);
  }
  return embed;
}

export function validateChannelType(channel: any, expectedTypes: ChannelType[]): { valid: boolean; typeName: string } {
  if (!channel || !channel.type) return { valid: false, typeName: "Unknown" };
  const valid = expectedTypes.includes(channel.type);
  const typeName = ChannelType[channel.type] || `${channel.type}`;
  return { valid, typeName };
}

export function checkPermissionHierarchy(executor: GuildMember, target: GuildMember, botMember?: GuildMember): { allowed: boolean; reason?: string } {
  if (!executor || !target) return { allowed: false, reason: "Invalid member objects." };
  if (executor.guild.ownerId === executor.id) {
    if (botMember && botMember.roles.highest.position <= target.roles.highest.position && target.guild.ownerId !== botMember.id) {
      return { allowed: false, reason: "Bot's highest role is equal to or lower than target member's role." };
    }
    return { allowed: true };
  }

  const executorRole = executor.roles.highest;
  const targetRole = target.roles.highest;

  if (executorRole.position < targetRole.position) {
    return { allowed: false, reason: "Executor role is lower than target role." };
  }

  if (botMember && botMember.roles.highest.position <= targetRole.position && target.guild.ownerId !== botMember.id) {
    return { allowed: false, reason: "Bot cannot act on target due to role hierarchy." };
  }

  return { allowed: true };
}

export function safeCreateMessageCollector(channel: TextChannel, filter: (m: any) => boolean, options: { time?: number; max?: number } = {}): any {
  try {
    const safeOptions: any = {
      time: options.time || 60000,
      max: options.max || 100,
      dispose: true
    };
    return channel.createMessageCollector({ filter, ...safeOptions });
  } catch (err) {
    console.error("safeCreateMessageCollector error:", err);
    return null;
  }
}

export async function safeReply(interaction: any, payload: any): Promise<any> {
  try {
    if (!interaction) return null;
    if (interaction.replied || interaction.deferred) {
      return await interaction.editReply(payload);
    } else {
      return await interaction.reply(payload);
    }
  } catch (err) {
    console.error("safeReply exception:", err);
    try {
      return await interaction.followUp(payload);
    } catch (err2) {
      console.error("safeReply followUp fallback exception:", err2);
      return null;
    }
  }
}

export async function safeDeferReply(interaction: any, ephemeral: boolean = true): Promise<void> {
  try {
    if (!interaction) return;
    if (!interaction.replied && !interaction.deferred) {
      const options: any = {};
      if (ephemeral) {
        options.flags = MessageFlags.Ephemeral;
      }
      await interaction.deferReply(options);
    }
  } catch (err) {
    console.error("safeDeferReply exception:", err);
  }
}

// ==================== CLASSES ====================

export class CommandCooldownManager {
  private static cooldowns = new Map<string, Map<string, number>>();
  private static locks = new Set<string>();

  static checkAndSet(userId: string, commandName: string, cooldownSeconds: number = 3): { onCooldown: boolean; remaining: number } {
    const lockKey = `${commandName}:${userId}`;
    if (this.locks.has(lockKey)) {
      return { onCooldown: true, remaining: cooldownSeconds };
    }
    this.locks.add(lockKey);

    try {
      if (!this.cooldowns.has(commandName)) {
        this.cooldowns.set(commandName, new Map());
      }
      const timestamps = this.cooldowns.get(commandName)!;
      const now = Date.now();
      const cooldownAmount = cooldownSeconds * 1000;

      if (timestamps.has(userId)) {
        const expirationTime = timestamps.get(userId)! + cooldownAmount;
        if (now < expirationTime) {
          const remaining = (expirationTime - now) / 1000;
          return { onCooldown: true, remaining };
        }
      }

      timestamps.set(userId, now);
      return { onCooldown: false, remaining: 0 };
    } finally {
      this.locks.delete(lockKey);
    }
  }

  static clear() {
    this.cooldowns.clear();
    this.locks.clear();
  }

  static cleanup() {
    const now = Date.now();
    for (const [cmd, timestamps] of this.cooldowns.entries()) {
      for (const [userId, time] of timestamps.entries()) {
        if (now - time > 60000) {
          timestamps.delete(userId);
        }
      }
      if (timestamps.size === 0) {
        this.cooldowns.delete(cmd);
      }
    }
  }
}
