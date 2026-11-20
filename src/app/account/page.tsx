import { ActionForm, SubmitButton } from "@/components/form";
import { requireUser } from "@/lib/data";
import { changePassword } from "./actions";

export default async function AccountPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-4xl sm:text-5xl">Change password</h1>
      <div className="card">
        <ActionForm action={changePassword} className="space-y-4">
          <div>
            <label htmlFor="password" className="label">
              New password <span className="font-normal">(6+ characters)</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="input"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="label">
              Type it again
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="input"
            />
          </div>
          <SubmitButton>Save new password</SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
