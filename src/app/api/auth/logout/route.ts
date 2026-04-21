import { destroySession } from "@/lib/auth";
import { redirectTo } from "@/lib/request";

export async function POST(request: Request) {
  await destroySession();

  return redirectTo(request, "/");
}
