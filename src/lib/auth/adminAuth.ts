import { createRouteHandlerClientWithCookies } from "@/utils/supabase/server";

const ADMIN_EMAILS = ["joshuaooi105@gmail.com", "ghayuan.ng@gmail.com", "jjzlee018@gmail.com"];

export async function getAdminUser() {
  const supabase = await createRouteHandlerClientWithCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !ADMIN_EMAILS.includes(user.email)) {
    return null;
  }

  return user;
}

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email);
}

export { ADMIN_EMAILS };
