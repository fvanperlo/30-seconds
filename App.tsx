import React, { useState, useRef } from 'react';
import { AppState, GameCard } from './types';
import { TERMS_PER_CARD, DEFAULT_CARD_COUNT } from './constants';
import { generateTermsFromTopic, expandTermList } from './services/geminiService';
import { CardPreview } from './components/CardPreview';
import { Button } from './components/Button';
import { Upload, Copy, Settings, RotateCcw, Sparkles, Download, Palette } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function App() {
  // State
  const [appState, setAppState] = useState<AppState>(AppState.INPUT);
  const [topic, setTopic] = useState('');
  const [cardTitle, setCardTitle] = useState('30 Seconds');
  const [categoryLabel, setCategoryLabel] = useState('');
  const [manualText, setManualText] = useState('');
  const [cardCount, setCardCount] = useState(DEFAULT_CARD_COUNT);
  const [cards, setCards] = useState<GameCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setManualText(text);
    };
    reader.readAsText(file);
  };

  const processInputAndGenerate = async () => {
    setError(null);
    setAppState(AppState.GENERATING);

    try {
      let terms: string[] = [];
      
      // 1. Parse manual text
      if (manualText.trim()) {
        // Split by newlines or commas
        terms = manualText
          .split(/[\n,]+/)
          .map(t => t.trim())
          .filter(t => t.length > 0);
      }

      const neededTerms = cardCount * TERMS_PER_CARD;

      // 2. Logic: If manual terms exist but aren't enough, OR no manual terms but topic exists
      if (terms.length < neededTerms) {
        if (!topic && terms.length === 0) {
          throw new Error("Voer begrippen in of kies een onderwerp.");
        }

        if (topic) {
          // If we have some terms, expand. If none, generate fresh.
          if (terms.length > 0) {
             const newTerms = await expandTermList(terms, neededTerms, topic);
             terms = newTerms;
          } else {
             const generated = await generateTermsFromTopic(topic, cardCount);
             terms = generated;
          }
        } else {
           // No topic provided, but not enough terms.
           // We can only loop existing terms or warn. 
           // Let's just shuffle and loop to fill if user didn't ask for AI help explicitly via topic
           // Actually, better UX: Ask them to provide more or reduce card count.
           // For this MVP, we will cycle the terms if no topic is present to generate more.
           if (terms.length === 0) throw new Error("Geen begrippen gevonden.");
           
           let extendedTerms = [...terms];
           while (extendedTerms.length < neededTerms) {
             extendedTerms = [...extendedTerms, ...terms];
           }
           terms = extendedTerms;
        }
      }

      // 3. Shuffle terms
      const shuffled = [...terms].sort(() => 0.5 - Math.random());

      // 4. Create Cards
      const newCards: GameCard[] = [];
      for (let i = 0; i < cardCount; i++) {
        const start = i * TERMS_PER_CARD;
        const cardTerms = shuffled.slice(start, start + TERMS_PER_CARD);
        
        // If we still ran out (edge case), fill with placeholders
        while (cardTerms.length < TERMS_PER_CARD) {
           cardTerms.push("???");
        }

        newCards.push({
          id: `card-${i}`,
          category: categoryLabel || topic || 'Gemengd',
          terms: cardTerms
        });
      }

      setCards(newCards);
      setAppState(AppState.PREVIEW);

    } catch (err: any) {
      setError(err.message || "Er is iets fout gegaan.");
      setAppState(AppState.INPUT);
    }
  };

  const generatePDF = async () => {
    if (!printContainerRef.current) return;
    
    // Create PDF: A4 Landscape or Portrait? 
    // Cards are 9cm wide. A4 width is 21cm. 2 cards fit width-wise (18cm) with margins.
    // Let's do A4 Portrait.
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Wait for render if needed, but we are in preview so DOM is ready.
    // We render each card individually to high-res canvas and place on PDF
    
    const cardElements = printContainerRef.current.querySelectorAll('.printable-card');
    
    // Config
    const cardsPerPage = 8;
    const marginLeft = 10;
    const marginTop = 20;
    const cardW = 90; // mm
    const cardH = 50; // mm
    const gapX = 10; // 10mm horizontal gap
    const gapY = 10; // 10mm vertical gap
    
    // Show loading state implicitly by async await
    // Note: html2canvas is async.
    
    for (let i = 0; i < cardElements.length; i++) {
      const el = cardElements[i] as HTMLElement;
      
      // Page break logic
      if (i > 0 && i % cardsPerPage === 0) {
        pdf.addPage();
      }
      
      const indexOnPage = i % cardsPerPage;
      const col = indexOnPage % 2;
      const row = Math.floor(indexOnPage / 2);
      
      const x = marginLeft + (col * (cardW + gapX));
      const y = marginTop + (row * (cardH + gapY));

      const canvas = await html2canvas(el, {
        scale: 4, // Higher scale for crisp text
        useCORS: true,
        backgroundColor: "#ffffff"
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', x, y, cardW, cardH);
    }
    
    pdf.save(`${topic || '30-seconds'}-kaarten.pdf`);
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 text-white font-bold rounded p-1.5">30s</div>
            <h1 className="text-xl font-bold text-slate-800">30 seconds kaartjesmaker</h1>
          </div>
          <div className="flex items-center space-x-4">
             {appState === AppState.PREVIEW && (
                <Button 
                   variant="outline" 
                   onClick={() => setAppState(AppState.INPUT)}
                   icon={<RotateCcw size={16} />}
                >
                  Opnieuw
                </Button>
             )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
             <span className="mr-2">⚠️</span> {error}
          </div>
        )}

        {/* INPUT VIEW */}
        {appState === AppState.INPUT && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
            
            {/* Left Column: Settings */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-slate-500" />
                  Instellingen
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Onderwerp (voor AI)
                    </label>
                    <input 
                      type="text" 
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Bijv. Geschiedenis, Biologie, Kerstmis..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Dit onderwerp gebruikt de AI om begrippen te verzinnen.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                        Titel (zijkant)
                        </label>
                        <input 
                        type="text" 
                        value={cardTitle}
                        onChange={(e) => setCardTitle(e.target.value)}
                        placeholder="30 Seconds"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                        Categorie (rechtsonder)
                        </label>
                        <input 
                        type="text" 
                        value={categoryLabel}
                        onChange={(e) => setCategoryLabel(e.target.value)}
                        placeholder="Optioneel"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Aantal kaartjes
                    </label>
                    <div className="flex items-center space-x-4">
                      <input 
                        type="range" 
                        min="4" 
                        max="40" 
                        step="4"
                        value={cardCount}
                        onChange={(e) => setCardCount(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="font-mono bg-slate-100 px-3 py-1 rounded text-slate-700">
                        {cardCount}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Totaal benodigde begrippen: <span className="font-bold">{cardCount * TERMS_PER_CARD}</span>
                    </p>
                  </div>
                </div>
              </div>

               <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 text-blue-800 text-sm">
                  <h3 className="font-semibold flex items-center mb-2">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Hoe het werkt
                  </h3>
                  <p>
                    Je kunt zelf begrippen invoeren, of alleen een onderwerp opgeven en onze AI de begrippen laten bedenken.
                    Als je lijst te kort is, vult de AI deze automatisch aan!
                  </p>
               </div>
            </div>

            {/* Right Column: Input */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                  <Copy className="w-5 h-5 mr-2 text-slate-500" />
                  Begrippen Invoeren
                </h2>

                <div className="flex-1 flex flex-col space-y-3">
                  <textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder={`Plak hier je begrippenlijst (gescheiden door enters of komma's).\n\nBijvoorbeeld:\nAppel\nPeer\nBanaan\n...`}
                    className="flex-1 w-full min-h-[200px] px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono text-sm"
                  />
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-2 bg-white text-sm text-slate-500">OF</span>
                    </div>
                  </div>

                  <div className="flex justify-center">
                     <button 
                       onClick={() => fileInputRef.current?.click()}
                       className="flex items-center text-sm text-slate-600 hover:text-blue-600 transition-colors"
                     >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload .txt bestand
                     </button>
                     <input 
                        type="file" 
                        ref={fileInputRef}
                        accept=".txt,.csv"
                        className="hidden"
                        onChange={handleFileUpload}
                     />
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100">
                  <Button 
                    onClick={processInputAndGenerate} 
                    className="w-full h-12 text-lg"
                    icon={<Sparkles />}
                  >
                    Genereer Kaartjes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LOADING STATE */}
        {appState === AppState.GENERATING && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
             <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-6"></div>
             <h2 className="text-2xl font-bold text-slate-800">Even geduld...</h2>
             <p className="text-slate-500 mt-2">De AI verzint de beste begrippen voor jouw spel.</p>
          </div>
        )}

        {/* PREVIEW VIEW */}
        {appState === AppState.PREVIEW && (
          <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div>
                 <h2 className="text-2xl font-bold text-slate-800">Klaar om te printen!</h2>
                 <p className="text-slate-600">Je hebt {cards.length} kaartjes gegenereerd.</p>
              </div>
              <div className="flex space-x-3">
                 <Button variant="secondary" onClick={generatePDF} icon={<Download size={18} />}>
                   Download PDF
                 </Button>
              </div>
            </div>

            {/* Customization Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center text-slate-700 font-medium">
                    <Palette className="w-5 h-5 mr-2 text-blue-600" />
                    Kaart Opmaak:
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-500 whitespace-nowrap">Titel (zijkant):</label>
                        <input 
                            type="text" 
                            value={cardTitle}
                            onChange={(e) => setCardTitle(e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="30 Seconds"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-500 whitespace-nowrap">Categorie:</label>
                        <input 
                            type="text" 
                            value={categoryLabel}
                            onChange={(e) => setCategoryLabel(e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Automatisch"
                        />
                    </div>
                </div>
            </div>

            {/* Print Container (Visible in UI, used for canvas generation) */}
            <div className="bg-slate-200 p-8 rounded-xl overflow-auto shadow-inner">
               <div 
                 ref={printContainerRef} 
                 className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 mx-auto"
                 style={{ width: 'fit-content' }} 
               >
                  {cards.map((card, idx) => (
                    <CardPreview 
                      key={card.id} 
                      card={card} 
                      index={idx} 
                      title={cardTitle}
                      category={categoryLabel}
                      className="printable-card shadow-md transform hover:scale-[1.02] transition-transform duration-200" 
                    />
                  ))}
               </div>
            </div>
            
            <p className="text-center text-slate-400 mt-8 text-sm">
               Let op: De PDF wordt gegenereerd op A4 formaat. Zorg dat je printerinstellingen op 'Ware grootte' of '100% schaal' staan.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}