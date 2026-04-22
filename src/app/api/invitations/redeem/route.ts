import { requireUser } from "@/lib/auth";
import { acceptHouseholdInvite } from "@/lib/household-management";
import { redirectTo } from "@/lib/request";
import { redeemInviteSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const user = await requireUser();
  const formData = await request.formData();
  const parsed = redeemInviteSchema.safeParse({
    code: formData.get("code"),
  });

  if (!parsed.success) {
    return redirectTo(request, "/app?join=invalid_code");
  }

  const result = await acceptHouseholdInvite({
    inviteCode: parsed.data.code,
    user,
  });

  if (result.status === "joined" || result.status === "already_member") {
    return redirectTo(request, `/app?household=${result.invite?.householdId}&joined=1`);
  }

  return redirectTo(request, "/app?join=invalid_code");
}
