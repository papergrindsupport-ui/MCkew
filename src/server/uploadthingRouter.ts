// UploadThing file routes for admin question images. Token must be set via env (see `resolveUploadThingToken`).
import { createUploadthing, UploadThingError, type FileRouter } from "uploadthing/server";
import { requireAdmin } from "@/server/requireAdmin";

const f = createUploadthing();

export const uploadRouter = {
  // Don't wait for UT → origin callback before resolving the client upload (avoids infinite
  // "uploading" when dev URLs aren't reachable from UT, and is fine for our use case).
  questionImage: f(
    { image: { maxFileSize: "8MB", maxFileCount: 1 } },
    { awaitServerData: false },
  )
    .middleware(async ({ req }) => {
      const auth = await requireAdmin(req);
      if (auth instanceof Response) {
        throw new UploadThingError({
          code: "FORBIDDEN",
          message: "Admin sign-in required to upload images.",
        });
      }
      return { clerkId: auth.clerkId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.clerkId, url: file.url };
    }),
} satisfies FileRouter;

export type AppFileRouter = typeof uploadRouter;
