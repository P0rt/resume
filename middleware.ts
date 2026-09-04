import { localeRedirect } from "./lib/locale-routing.mjs";

export const config = {
  matcher: ["/", "/work-together/"],
};

export default function localeMiddleware(request: Request) {
  return localeRedirect(request);
}
