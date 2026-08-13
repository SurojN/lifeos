import { clerkMiddleware } from "@clerk/nextjs/server";

// Authentication context is established here. Authorization is enforced at the
// resource boundary: protected layouts and every personal-data route call
// requireInternalUser(), avoiding route-pattern drift.
export default clerkMiddleware();

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|webmanifest)).*)", "/(api)(.*)"],
};
