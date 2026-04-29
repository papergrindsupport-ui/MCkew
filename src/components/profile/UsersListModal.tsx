// Followers / Following modal — list of users with avatar + username link.

import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { avatarUrlFor, getUserByUsername } from "@/lib/profileStore";
import { Users } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  usernames: string[];
}

export default function UsersListModal({ open, onOpenChange, title, usernames }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users size={18} /> {title}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              ({usernames.length})
            </span>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-96">
          <div className="space-y-1 pr-2">
            {usernames.length === 0 && (
              <p className="text-sm text-muted-foreground italic px-2 py-6 text-center">
                No one here yet.
              </p>
            )}
            {usernames.map((un, i) => {
              const u = getUserByUsername(un);
              return (
                <motion.div
                  key={un}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    to="/profile/$username"
                    params={{ username: un }}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <img
                      src={avatarUrlFor(u ?? { username: un, hasProfilePicture: false })}
                      alt=""
                      className="h-9 w-9 rounded-full bg-muted"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-foreground truncate">
                        {u?.displayName ?? un}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">@{un}</div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
