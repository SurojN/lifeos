import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/documents(.*)", "/medical(.*)", "/timeline(.*)", "/settings(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) await auth.protect();
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|webmanifest)).*)", "/(api)(.*)"],
};
