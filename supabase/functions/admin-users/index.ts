import { logActivity, requireMember } from "../_shared/auth.ts";
import { handler, HttpError, json } from "../_shared/cors.ts";

/**
 * Admin-only team management. Public sign-up stays disabled; this is the only
 * in-app way to create accounts. Uses the service role (server-side only).
 */
Deno.serve(
  handler(async (req) => {
    const caller = await requireMember(req, "admin");
    const body = await req.json();
    const roles = ["admin", "editor", "viewer"];

    switch (body.action) {
      case "invite": {
        const email = String(body.email ?? "").trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "Neplatný e-mail");
        const role = roles.includes(body.role) ? body.role : "editor";
        const redirectTo = Deno.env.get("APP_URL") ? `${Deno.env.get("APP_URL")}/reset-password` : undefined;
        const { data, error } = await caller.admin.auth.admin.inviteUserByEmail(email, {
          data: { full_name: body.fullName || email.split("@")[0] },
          redirectTo,
        });
        if (error) throw new HttpError(400, error.message);
        // Trigger created the profile as editor — apply the requested role.
        await caller.admin.from("profiles").update({ role, full_name: body.fullName || null }).eq("id", data.user.id);
        await logActivity(caller, "user.invite", { email, role });
        return json({ ok: true, userId: data.user.id });
      }
      case "set_role": {
        if (!roles.includes(body.role)) throw new HttpError(400, "Neplatná role");
        if (body.userId === caller.userId) throw new HttpError(400, "Nemůžete změnit vlastní roli");
        const { error } = await caller.admin.from("profiles").update({ role: body.role }).eq("id", body.userId);
        if (error) throw new HttpError(400, error.message);
        await logActivity(caller, "user.role", { userId: body.userId, role: body.role });
        return json({ ok: true });
      }
      case "remove": {
        if (body.userId === caller.userId) throw new HttpError(400, "Nemůžete odebrat sami sebe");
        const { error } = await caller.admin.auth.admin.deleteUser(body.userId);
        if (error) throw new HttpError(400, error.message);
        await logActivity(caller, "user.remove", { userId: body.userId });
        return json({ ok: true });
      }
      default:
        throw new HttpError(400, "Neznámá akce");
    }
  }),
);
