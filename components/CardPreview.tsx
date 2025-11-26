import React from 'react';
import { GameCard } from '../types';

interface CardPreviewProps {
  card: GameCard;
  index: number;
  className?: string;
  id?: string;
  title?: string;
  category?: string;
  maxTerms?: number;
}

export const CardPreview: React.FC<CardPreviewProps> = ({ 
  card, 
  index, 
  className = '', 
  id, 
  title, 
  category,
  maxTerms = 5
}) => {
  return (
    <div 
      id={id}
      className={`relative bg-white border-2 border-slate-800 rounded-xl overflow-hidden flex flex-row shadow-sm ${className}`}
      style={{
        width: '9cm', 
        height: '5cm',
        pageBreakInside: 'avoid'
      }}
    >
      {/* Left Sidebar - Vertical Title */}
      <div className="w-10 bg-blue-600 flex items-center justify-center shrink-0 border-r border-blue-700">
        <span 
          className="text-white font-bold text-sm tracking-widest uppercase whitespace-nowrap"
          style={{ transform: 'rotate(-90deg)' }}
        >
          {title || '30 Seconds'}
        </span>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col justify-center px-4 py-2 bg-slate-50 relative">
        <ul className="space-y-1.5 w-full">
          {card.terms.map((term, i) => (
            <li key={i} className="text-slate-900 font-bold text-sm leading-snug border-b border-slate-200 last:border-0 pb-1 truncate">
              {term}
            </li>
          ))}
          {/* Fill empty spots if any to reach maxTerms */}
          {Array.from({ length: Math.max(0, maxTerms - card.terms.length) }).map((_, i) => (
             <li key={`empty-${i}`} className="text-slate-300 text-sm leading-snug border-b border-slate-200 last:border-0 pb-1">
             ...
           </li>
          ))}
        </ul>

        {/* Subtle category indicator in bottom right corner */}
        <div className="absolute bottom-1 right-2 text-[8px] text-slate-400 font-medium uppercase tracking-wider">
          {category || card.category}
        </div>
      </div>
    </div>
  );
};