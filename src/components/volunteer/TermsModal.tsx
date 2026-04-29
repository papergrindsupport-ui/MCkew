import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScrollText, Heart } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  type: "terms" | "rules";
}

export default function TermsModal({ open, onClose, type }: Props) {
  const isTerms = type === "terms";
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {isTerms ? (
              <ScrollText size={20} className="text-primary" />
            ) : (
              <Heart size={20} className="text-primary" />
            )}
            {isTerms ? "Terms of Service" : "Volunteer Rules & Conduct"}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
            {isTerms ? <TermsContent /> : <RulesContent />}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function TermsContent() {
  return (
    <>
      <p className="text-muted-foreground italic">
        Last updated: today. This is placeholder copy — real terms are coming soon.
      </p>
      <h3 className="font-bold text-base mt-4">1. About this program</h3>
      <p>
        Smart Solve volunteers help build, maintain, and improve resources for students worldwide.
        Volunteering is unpaid and entirely voluntary.
      </p>
      <h3 className="font-bold text-base mt-4">2. Your contributions</h3>
      <p>
        Anything you create, write, extract, or test as a Smart Solve volunteer becomes part of the
        platform under our content license. You retain credit; we retain the right to use, modify,
        and redistribute.
      </p>
      <h3 className="font-bold text-base mt-4">3. Confidentiality</h3>
      <p>
        You may receive early access to features, internal communications, or student data. Keep all
        of it confidential. Don't post screenshots, don't share access, don't talk about specifics
        outside the team.
      </p>
      <h3 className="font-bold text-base mt-4">4. Your data</h3>
      <p>
        The contact info you submit is used solely to process your application and reach you about
        volunteer matters. You can request deletion at any time.
      </p>
      <h3 className="font-bold text-base mt-4">5. Termination</h3>
      <p>
        Either side can end the volunteer relationship at any time, for any reason, with no notice
        required.
      </p>
      <h3 className="font-bold text-base mt-4">6. Liability</h3>
      <p>
        Smart Solve isn't liable for any losses, damages, or claims arising from your volunteer
        work. You contribute at your own discretion.
      </p>
      <p className="text-xs text-muted-foreground italic mt-6">
        By accepting, you confirm you've read and understood these terms.
      </p>
    </>
  );
}

function RulesContent() {
  return (
    <>
      <p className="text-muted-foreground italic">
        Quick rules — these matter more than the legal stuff.
      </p>
      <h3 className="font-bold text-base mt-4">🤝 Be kind</h3>
      <p>
        Treat students, teachers, and other volunteers with patience and respect. We're building
        this for nervous teenagers who are stressed about exams. Always punch up, never down.
      </p>
      <h3 className="font-bold text-base mt-4">⏰ Communicate</h3>
      <p>
        If life gets busy, just tell us. No ghosting. A 30-second "I'm slammed this week" message
        keeps everything smooth.
      </p>
      <h3 className="font-bold text-base mt-4">📚 Quality first</h3>
      <p>One carefully-extracted paper beats five rushed ones. We'd rather you do less, well.</p>
      <h3 className="font-bold text-base mt-4">🔒 Don't impersonate</h3>
      <p>
        Never claim to speak officially for Smart Solve outside designated channels. Never DM
        students cold. Always use the support channels we set up.
      </p>
      <h3 className="font-bold text-base mt-4">🚫 Zero tolerance</h3>
      <p>
        Harassment, hate speech, leaking confidential info, or contacting students inappropriately =
        immediate removal, no second chance.
      </p>
      <h3 className="font-bold text-base mt-4">💝 Have fun</h3>
      <p>Seriously. If it stops being fun, tell us. We'll figure it out together.</p>
    </>
  );
}
