import { useState, type FormEvent } from "react";
import { Ghost } from "lucide-react";
import { postProfile, ApiError, type CreatorProfile } from "../lib/api";
import { useToast } from "../context/ToastContext";
import Spinner from "../components/Spinner";

const DEMO_PROFILE: CreatorProfile = {
  name: "Jordan Vale",
  email: "jordan.vale@creatormail.com",
  address: "221B Creator Lane, Los Angeles, CA 90028, USA",
  phone: "+1 (555) 019-4477",
};

interface Props {
  onDone: () => void;
}

export default function Onboarding({ onDone }: Props) {
  const [form, setForm] = useState<CreatorProfile>({
    name: "",
    email: "",
    address: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const update = (field: keyof CreatorProfile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await postProfile(form);
      showToast(`Welcome, ${form.name.split(" ")[0] || "creator"} — profile saved.`, "success");
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save profile.");
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = () => setForm(DEMO_PROFILE);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center">
      <div className="mb-8 text-center">
        <Ghost className="mx-auto mb-3 h-12 w-12 text-violet-400 drop-shadow-[0_0_10px_rgba(139,92,246,0.55)]" />
        <h1 className="text-2xl font-bold text-white">Welcome to GhostTrace</h1>
        <p className="mt-2 text-sm text-slate-400">
          Tell us who you are so we can file DMCA takedowns on your behalf. This
          info goes straight into the notices we generate — no account, no
          password.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl"
      >
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <Field label="Full name" required>
          <input
            required
            value={form.name}
            onChange={update("name")}
            placeholder="Jordan Vale"
            className={inputClass}
          />
        </Field>

        <Field label="Email" required>
          <input
            required
            type="email"
            value={form.email}
            onChange={update("email")}
            placeholder="jordan@creatormail.com"
            className={inputClass}
          />
        </Field>

        <Field label="Mailing address" required>
          <input
            required
            value={form.address}
            onChange={update("address")}
            placeholder="221B Creator Lane, Los Angeles, CA"
            className={inputClass}
          />
        </Field>

        <Field label="Phone" required>
          <input
            required
            value={form.phone}
            onChange={update("phone")}
            placeholder="+1 (555) 019-4477"
            className={inputClass}
          />
        </Field>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 font-semibold text-white shadow transition hover:bg-violet-500 disabled:opacity-60"
          >
            {submitting && <Spinner size={16} />}
            {submitting ? "Saving…" : "Save & continue"}
          </button>
          <button
            type="button"
            onClick={fillDemo}
            className="shrink-0 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5"
          >
            Use Demo Profile
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-400">
        {label}
        {required && <span className="text-violet-400"> *</span>}
      </span>
      {children}
    </label>
  );
}
