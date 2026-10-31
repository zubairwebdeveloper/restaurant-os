import { NextResponse } from "next/server";

// TEMPORARY: Authentication guard disabled during development.
export function proxy(request) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/platform/:path*"],
};

// import { NextResponse } from "next/server";
// import { SESSION_COOKIE } from "@/lib/auth/constants";

// /**
//  * OPTIMISTIC route guard only: it checks that a session cookie EXISTS so signed-out
//  * visitors are redirected early. It does not prove the session is valid. Real
//  * verification happens on the server in lib/auth/dal.js for every request.
//  */
// export function proxy(request) {
//   if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

//   const { pathname, search } = request.nextUrl;
//   const login = new URL("/login", request.url);
//   login.searchParams.set("next", `${pathname}${search}`);
//   return NextResponse.redirect(login);
// }

// export const config = {
//   matcher: ["/dashboard/:path*", "/platform/:path*"],
// };
