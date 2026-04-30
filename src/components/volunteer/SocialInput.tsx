import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ExternalLink, AlertCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  FaInstagram,
  FaTwitter,
  FaFacebook,
  FaReddit,
  FaTiktok,
  FaLinkedin,
  FaDiscord,
  FaTelegram,
  FaSnapchat,
  FaLink,
} from "react-icons/fa";
import type { SocialContact, SocialPlatform } from "./volunteer-types";

interface PlatformDef {
  value: SocialPlatform;
  label: string;
  prefix: string;
  buildLink: (u: string) => string;
  icon: React.ReactNode; // Updated to React.ReactNode to handle the icons directly
}

const PLATFORMS: PlatformDef[] = [
  {
    value: "instagram",
    label: "Instagram",
    prefix: "@",
    buildLink: (u) => `https://instagram.com/${u}`,
    icon: <FaInstagram />, // Using react-icons for Instagram
  },
  {
    value: "twitter",
    label: "X (Twitter)",
    prefix: "@",
    buildLink: (u) => `https://x.com/${u}`,
    icon: <FaTwitter />, // Using react-icons for Twitter
  },
  {
    value: "facebook",
    label: "Facebook",
    prefix: "@",
    buildLink: (u) => `https://facebook.com/${u}`,
    icon: <FaFacebook />, // Using react-icons for Facebook
  },
  {
    value: "reddit",
    label: "Reddit",
    prefix: "u/",
    buildLink: (u) => `https://reddit.com/user/${u}`,
    icon: <FaReddit />, // Using react-icons for Reddit
  },
  {
    value: "tiktok",
    label: "TikTok",
    prefix: "@",
    buildLink: (u) => `https://tiktok.com/@${u}`,
    icon: <FaTiktok />, // Using react-icons for TikTok
  },
  {
    value: "linkedin",
    label: "LinkedIn",
    prefix: "in/",
    buildLink: (u) => `https://linkedin.com/in/${u}`,
    icon: <FaLinkedin />, // Using react-icons for LinkedIn
  },
  {
    value: "discord",
    label: "Discord",
    prefix: "",
    buildLink: (u) => `https://discord.com/users/${u}`,
    icon: <FaDiscord />, // Using react-icons for Discord
  },
  {
    value: "telegram",
    label: "Telegram",
    prefix: "@",
    buildLink: (u) => `https://t.me/${u}`,
    icon: <FaTelegram />, // Using react-icons for Telegram
  },
  {
    value: "snapchat",
    label: "Snapchat",
    prefix: "",
    buildLink: (u) => `https://snapchat.com/add/${u}`,
    icon: <FaSnapchat />, // Using react-icons for Snapchat
  },
  { value: "other", label: "Other", prefix: "", buildLink: (u) => u, icon: <FaLink /> }, // Using a generic link icon
];

interface Props {
  value: SocialContact;
  onChange: (v: SocialContact) => void;
}

export default function SocialInput({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const platform = PLATFORMS.find((p) => p.value === value.platform) || PLATFORMS[0];
  const cleanedUsername = value.username.replace(/^@+|^u\/|^in\//, "");
  const previewLink = cleanedUsername ? platform.buildLink(cleanedUsername) : "";

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-3 h-11 rounded-xl border-2 border-border bg-card hover:bg-muted/50 transition-colors min-w-[140px]"
            >
              {platform.icon}
              <span className="text-sm font-semibold text-foreground flex-1 text-left">
                {platform.label}
              </span>
              <ChevronDown size={14} className="text-muted-foreground" />
            </motion.button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1.5" align="start">
            <div className="space-y-0.5">
              {PLATFORMS.map((p) => (
                <motion.button
                  key={p.value}
                  type="button"
                  whileHover={{ x: 2 }}
                  onClick={() => {
                    onChange({ ...value, platform: p.value });
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-left ${
                    value.platform === p.value
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {p.icon}
                  <span>{p.label}</span>
                </motion.button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex-1 flex items-center gap-1 px-3 h-11 rounded-xl border-2 border-border bg-card focus-within:border-primary transition-colors">
          {platform.prefix && (
            <span className="text-sm font-bold text-primary select-none">{platform.prefix}</span>
          )}
          <input
            type="text"
            placeholder={platform.value === "other" ? "Username or handle" : "username"}
            value={cleanedUsername}
            onChange={(e) => onChange({ ...value, username: e.target.value.trim() })}
            className="flex-1 bg-transparent text-sm font-medium text-foreground focus:outline-none placeholder:text-muted-foreground min-w-0"
          />
        </div>
      </div>

      {value.platform === "other" && (
        <div className="space-y-1.5">
          <input
            type="text"
            placeholder="Platform name (e.g. Mastodon)"
            value={value.customPlatform || ""}
            onChange={(e) => onChange({ ...value, customPlatform: e.target.value })}
            className="w-full h-9 px-3 rounded-lg border-2 border-border bg-card text-sm focus:outline-none focus:border-primary"
          />
          <input
            type="url"
            placeholder="Profile URL (optional)"
            value={value.customLink || ""}
            onChange={(e) => onChange({ ...value, customLink: e.target.value })}
            className="w-full h-9 px-3 rounded-lg border-2 border-border bg-card text-sm focus:outline-none focus:border-primary"
          />
        </div>
      )}

      <AnimatePresence>
        {previewLink && platform.value !== "other" && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/60"
          >
            {value.platform === "instagram" && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                {cleanedUsername.charAt(0).toUpperCase() || "?"}
              </div>
            )}
            {value.platform !== "instagram" && (
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                {platform.icon}
              </div>
            )}
            <a
              href={previewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-xs text-primary hover:underline truncate flex items-center gap-1 font-medium"
            >
              {previewLink}
              <ExternalLink size={10} className="shrink-0" />
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {cleanedUsername && (
        <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <AlertCircle size={12} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-tight">
            Make sure DMs are open — we'll reach you here.
          </p>
        </div>
      )}
    </div>
  );
}
