import { requireUser } from "@/lib/auth";
import { acceptHouseholdInvite } from "@/lib/household-management";
import { redirectTo } from "@/lib/request";

type Params = {
  params: Promise<{ token: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser();
  const { token } = await params;
  const result = await acceptHouseholdInvite({
    inviteToken: token,
    user,
  });

  if (result.status === "joined" || result.status === "already_member") {
    return redirectTo(request, `/app?household=${result.invite?.householdId}&joined=1`);
  }

  return redirectTo(request, "/app?join=invalid");
}
