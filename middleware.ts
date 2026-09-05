import { localeRedirect } from "./lib/locale-routing.cjs";
import { next } from "@vercel/functions";

export const config = {
  matcher: ["/", "/work-together/"],
};

export default function localeMiddleware(request: Request) {
  return localeRedirect(request) ?? next();
}
