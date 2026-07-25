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
      showToast(`Welcome, ${form.name.split(" ")[0] || "creator"} — you are the claimant of record.`, "success");
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
        <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] text-white shadow-[0_0_20px_rgba(37,99,235,0.45)]">
          <Ghost className="h-6 w-6 stroke-[1.5]" />
        </span>
        <p className="eyebrow">Form GT-1 · Claimant Registration</p>
        <h1 className="display mt-2 text-[26px] text-ink">Claimant of Record</h1>
        <p className="mx-auto mt-3 max-w-sm text-xs leading-relaxed text-ink-soft">
          Tell us who you are so we can file DMCA takedowns on your behalf. This
          info goes straight into the notices we generate — no account, no password.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="surface space-y-5 p-6"
      >
        {error && (
          <div className="rounded-[10px] border border-crimson/25 bg-crimson-wash px-3 py-2 text-[13px] text-crimson-deep">
            {error}
          </div>
        )}

        <Field label="Full legal name" required>
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
          <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
            {submitting && <Spinner size={14} />}
            {submitting ? "Saving…" : "Continue"}
          </button>
          <button type="button" onClick={fillDemo} className="btn btn-secondary shrink-0">
            Use demo profile
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass = "input";

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
      <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">
        {label}
        {required && <span className="text-crimson"> *</span>}
      </span>
      {children}
    </label>
  );
}
