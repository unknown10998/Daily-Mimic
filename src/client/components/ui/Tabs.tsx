type TabsProps = {
  items: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
};

export const Tabs = ({ items, active, onChange }: TabsProps) => {
  return (
    <div className="flex flex-wrap gap-3 rounded-sm border-2 border-[#101418] bg-[#fbfcf8] p-2 shadow-[4px_4px_0_#101418]">
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={`rounded-sm border-2 px-4 py-2 text-sm font-black uppercase transition ${
              isActive
                ? 'border-[#101418] bg-[#ef5b4f] text-white shadow-[3px_3px_0_#101418]'
                : 'border-transparent bg-transparent text-[#101418] hover:border-[#101418] hover:bg-[#dff6f4]'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};
