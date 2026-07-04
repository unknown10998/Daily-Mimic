import { useState } from 'react';
import { showToast } from '@devvit/web/client';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

type LoginViewProps = {
  username: string;
  onComplete: () => void;
};

export const LoginView = ({ username, onComplete }: LoginViewProps) => {
  const [displayName, setDisplayName] = useState(username);
  const [saving, setSaving] = useState(false);

  const handleSignup = async () => {
    setSaving(true);

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: displayName.trim() || username }),
      });
      const result = await response.json();

      if (!response.ok || result.status !== 'ok') {
        showToast(result.message || 'Could not create your Mimic profile.');
        return;
      }

      showToast('You are in. Today’s prompt is waiting.');
      onComplete();
    } catch (error) {
      console.error(error);
      showToast('Could not create your Mimic profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid min-h-[70vh] place-items-center py-8">
      <Card className="w-full max-w-xl space-y-6 bg-[#fbfcf8]">
        <div className="flex flex-wrap gap-2">
          {'HELLO'.split('').map((letter, index) => (
            <span
              key={`${letter}-${index}`}
              className={`grid h-12 w-12 place-items-center rounded-sm border-2 border-[#101418] text-xl font-black text-white shadow-[3px_3px_0_#101418] ${
                index % 2 === 0 ? 'bg-[#00a7a5]' : 'bg-[#ef5b4f]'
              }`}
            >
              {letter}
            </span>
          ))}
        </div>

        <div>
          <p className="text-xs font-black uppercase text-[#ef5b4f]">Daily Reddit game</p>
          <h2 className="mt-3 text-4xl font-black leading-tight text-[#101418]">Write today. Hunt the AI tomorrow.</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#303943]">
            Mimic Daily is a Reddit-native guessing game: players write real answers, vote on which anonymous replies were human or AI, and train tomorrow’s AI by explaining what gave it away.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {['Answer today', 'Investigate tomorrow', 'See who fooled Reddit'].map((step, index) => (
            <div key={step} className="rounded-sm border-2 border-[#101418] bg-white p-3 shadow-[3px_3px_0_#101418]">
              <p className="text-xs font-black uppercase text-[#ef5b4f]">Step {index + 1}</p>
              <p className="mt-2 text-sm font-black text-[#101418]">{step}</p>
            </div>
          ))}
        </div>

        <div className="rounded-sm border-2 border-[#101418] bg-[#dff6f4] p-4">
          <p className="text-xs font-black uppercase text-[#303943]">Reddit account</p>
          <p className="mt-2 text-2xl font-black text-[#101418]">u/{username}</p>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-black uppercase text-[#101418]">Display name</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={32}
            className="w-full rounded-sm border-2 border-[#101418] bg-white px-4 py-3 font-semibold text-[#101418] outline-none focus:bg-[#fff9df] focus:shadow-[4px_4px_0_#c6a448]"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button loading={saving} onClick={handleSignup}>
            Sign up
          </Button>
          <Button variant="secondary" loading={saving} onClick={handleSignup}>
            Log in
          </Button>
        </div>
      </Card>
    </div>
  );
};
