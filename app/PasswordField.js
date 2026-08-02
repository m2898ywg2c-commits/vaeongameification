"use client";

// Password field with a reveal toggle.
//
// WHY
//
// Typing a password blind on a phone keyboard is how people end up locked out of an app
// they only signed up for because a family member asked them to. Autocorrect, a fat thumb
// and a shifted capital all produce the same silent dot, and the only feedback is a failure
// several seconds later with no clue which character went wrong.
//
// Being able to see what you typed is also an accessibility feature rather than a
// convenience. Anyone with limited sight, a tremor, or dyslexia is far more likely to get a
// long string right if they can check it.
//
// The old advice that masking is more secure has been reversed for years. Both the NCSC in
// the UK and NIST in the US now recommend offering a reveal, on the grounds that the real
// risk on a personal phone is not somebody reading over your shoulder, it is people choosing
// short weak passwords because long ones are impossible to type accurately.
//
// Defaults to hidden. It is a toggle, not a change of default.

import { useState } from "react";
import Icon from "./Icon";

export default function PasswordField({
  value,
  onChange,
  label = "Password",
  autoComplete = "current-password",
  minLength,
  required = true,
  id,
}) {
  const [shown, setShown] = useState(false);
  const inputId = id || "password";

  return (
    <div>
      <label htmlFor={inputId} className="block text-xs uppercase tracking-wide text-brand-muted mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={shown ? "text" : "password"}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          // Room on the right for the button, so a long password never runs underneath it.
          className="w-full rounded-sm px-3 py-2 pr-12 bg-brand-surface border border-brand-line text-brand-text outline-none focus:border-[#22D3EE]"
        />
        <button
          type="button"
          onClick={function () { setShown(!shown); }}
          // Explicitly not a submit button. Inside a form, a bare <button> submits, which
          // would have made the eye attempt a login every time somebody tapped it.
          className="absolute inset-y-0 right-0 flex items-center px-3"
          style={{ color: "var(--brand-muted)" }}
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          // Keeps the field focused and the keyboard up on mobile, so tapping the eye does
          // not dismiss the keyboard and lose your place.
          tabIndex={-1}
        >
          <Icon name={shown ? "eyeOff" : "eye"} size={18} />
        </button>
      </div>
    </div>
  );
}
