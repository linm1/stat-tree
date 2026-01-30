
import React, { useState } from 'react';
import { Copy, Check, Info } from 'lucide-react';

interface SASCardProps {
  title: string;
  code: string;
  description?: string;
  procedures: string[];
}

export const SASCard: React.FC<SASCardProps> = ({ title, code, description, procedures }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border-1 border-ink shadow-brutal flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b-1 border-ink flex justify-between items-center bg-soft">
        <div className="flex flex-col gap-1">
          <h3 className="font-bold text-ink text-sm uppercase font-mono tracking-tight">{title}</h3>
          <div className="flex flex-wrap gap-1 mt-1">
            {procedures.map(p => (
              <span key={p} className="text-[9px] uppercase font-bold text-ink bg-primary px-1.5 py-0.5 border-1 border-ink">
                {p}
              </span>
            ))}
          </div>
        </div>
        <button 
          onClick={handleCopy}
          className="brutal-btn p-2 hover:bg-primary transition-colors text-ink"
          title="Copy SAS code"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      
      <div className="flex-1 bg-ink p-4 overflow-x-auto">
        <pre className="text-xs text-primary selection:bg-white selection:text-ink">
          <code>{code}</code>
        </pre>
      </div>

      {description && (
        <div className="p-4 bg-white border-t-1 border-ink flex gap-3 items-start">
          <Info size={16} className="text-ink mt-0.5 flex-shrink-0" />
          <p className="text-xs text-ink leading-relaxed font-medium">
            {description}
          </p>
        </div>
      )}
    </div>
  );
};
