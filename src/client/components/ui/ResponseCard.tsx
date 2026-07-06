import { Badge } from './Badge';

export type ResponseOption = 'Human' | 'AI' | 'Hybrid';
export type ConfidenceOption = 'low' | 'medium' | 'high';

type ResponseCardProps = {
  text: string;
  selected?: ResponseOption | null | undefined;
  actual?: ResponseOption | null | undefined;
  authorDisplayName?: string | undefined;
  reveal?: boolean;
  reasoning?: string;
  confidence?: ConfidenceOption;
  disabled?: boolean;
  disabledReason?: string;
  onReasoningChange?: (value: string) => void;
  onConfidenceChange?: (value: ConfidenceOption) => void;
  onSelect: (choice: ResponseOption) => void;
};

const options: ResponseOption[] = ['Human', 'AI', 'Hybrid'];
const confidenceOptions: ConfidenceOption[] = ['low', 'medium', 'high'];

export const ResponseCard = ({ text, selected, actual, authorDisplayName, reveal = false, reasoning = '', confidence = 'medium', disabled = false, disabledReason, onReasoningChange, onConfidenceChange, onSelect }: ResponseCardProps) => {
  const correct = reveal && selected !== null && selected !== undefined && actual === selected;
  const revealStatus = disabled ? 'Skipped for fairness' : correct ? 'You got it right' : `You chose ${selected ?? 'Nothing'}`;

  return (
    <article className="mimic-tilt-card rounded-sm border-2 border-[#101418] bg-[#fbfcf8] p-5 shadow-[5px_5px_0_#101418]">
      <div className="flex items-center justify-between gap-3">
        <Badge tone={disabled ? 'warm' : 'soft'}>{disabled ? 'Your answer' : 'Anonymous'}</Badge>
        <span className="text-xs font-black uppercase text-[#ef5b4f]">{disabled ? 'skipped' : reveal ? 'revealed' : 'pick one'}</span>
      </div>
      <p className="mt-4 text-sm font-semibold leading-7 text-[#101418]">{text}</p>
      {disabled && disabledReason ? (
        <p className="mt-4 rounded-sm border-2 border-[#101418] bg-[#fff9df] px-3 py-2 text-sm font-black text-[#101418]">{disabledReason}</p>
      ) : null}
      {reveal && actual ? (
        <div className={`mt-5 rounded-sm border-4 border-[#101418] p-4 shadow-[5px_5px_0_#101418] ${correct ? 'bg-[#dff6f4]' : 'bg-[#fff9df]'}`}>
          <p className="text-xs font-black uppercase text-[#ef5b4f]">Actual answer</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-2xl font-black text-[#101418]">{actual}</p>
            <p className="text-sm font-black text-[#303943]">
              {revealStatus}
            </p>
          </div>
          {authorDisplayName ? (
            <p className="mt-3 rounded-sm border-2 border-[#101418] bg-white px-3 py-2 text-sm font-black text-[#101418]">
              Written by {authorDisplayName}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {options.map((option) => {
          const active = selected === option;
          return (
            <button
              key={option}
              type="button"
              disabled={reveal || disabled}
              data-sound="select"
              onClick={() => onSelect(option)}
              className={`rounded-sm border-2 px-3 py-2 text-sm font-black uppercase transition ${
                active
                  ? reveal && actual === option
                    ? 'border-[#101418] bg-[#00a7a5] text-white shadow-[3px_3px_0_#101418]'
                    : reveal
                      ? 'border-[#101418] bg-[#ef5b4f] text-white shadow-[3px_3px_0_#101418]'
                      : 'border-[#101418] bg-[#00a7a5] text-white shadow-[3px_3px_0_#101418]'
                  : reveal && actual === option
                    ? 'border-[#101418] bg-[#dff6f4] text-[#101418] shadow-[3px_3px_0_#101418]'
                  : 'border-[#101418] bg-white text-[#101418] hover:bg-[#dff6f4]'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
      {!reveal && selected && !disabled ? (
        <div className="mt-4 space-y-4">
          <div>
            <span className="text-xs font-black uppercase text-[#66707a]">Confidence</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {confidenceOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onConfidenceChange?.(option)}
                  data-sound="select"
                  className={`rounded-sm border-2 px-3 py-2 text-xs font-black uppercase ${confidence === option ? 'border-[#101418] bg-[#c6a448] text-[#101418] shadow-[3px_3px_0_#101418]' : 'border-[#101418] bg-white text-[#101418] hover:bg-[#fff9df]'}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="text-xs font-black uppercase text-[#66707a]">Reasoning</span>
            <textarea
              value={reasoning}
              onChange={(event) => onReasoningChange?.(event.target.value)}
              maxLength={400}
              placeholder="What gave it away? Tone, details, structure, or something else..."
              className="mt-2 min-h-24 w-full resize-y rounded-sm border-2 border-[#101418] bg-white px-3 py-3 text-sm font-semibold leading-6 text-[#101418] outline-none transition focus:bg-[#dff6f4]"
            />
          </label>
        </div>
      ) : null}
    </article>
  );
};
