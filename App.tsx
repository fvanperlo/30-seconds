import React, { useState, useRef } from 'react';
import { AppState, GameCard } from './types';
import { DEFAULT_TERMS_PER_CARD, DEFAULT_CARD_COUNT } from './constants';
import { CardPreview } from './components/CardPreview';
import { Button } from './components/Button';
import { Upload, Copy, Settings, RotateCcw, Sparkles, Download, Palette } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function App() {
  // State
  const [appState, setAppState] = useState<AppState>(AppState.INPUT);
  const [cardTitle, setCardTitle] = useState('30 Seconds');
  const [categoryLabel, setCategoryLabel] = useState('');
  const [manualText, setManualText] = useState('');
  const [cardCount, setCardCount] = useState(DEFAULT_CARD_COUNT);
  const [termsPerCard, setTermsPerCard] = useState(DEFAULT_TERMS_PER_CARD);
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

    // Simulate a short delay for UX consistency
    await new Promise(resolve => setTimeout(resolve, 500));

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

      const neededTerms = cardCount * termsPerCard;

      // 2. Logic: Strict validation for manual terms
      if (terms.length === 0) {
          throw new Error("Voer een lijst met begrippen in om te beginnen.");
      }

      if (terms.length < neededTerms) {
          throw new Error(`Je hebt te weinig begrippen. Voor ${cardCount} kaartjes heb je ${neededTerms} woorden nodig (${termsPerCard} per kaart). Je hebt er nu ${terms.length}. Voeg meer woorden toe of verminder het aantal kaartjes.`);
      }

      // 3. Shuffle terms
      const shuffled = [...terms].sort(() => 0.5 - Math.random());

      // 4. Create Cards
      const newCards: GameCard[] = [];
      for (let i = 0; i < cardCount; i++) {
        const start = i * termsPerCard;
        const cardTerms = shuffled.slice(start, start + termsPerCard);
        
        // Safety check (though validated above)
        while (cardTerms.length < termsPerCard) {
           cardTerms.push("???");
        }

        newCards.push({
          id: `card-${i}`,
          category: categoryLabel || 'Gemengd',
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
    
    // Create PDF: A4 Portrait
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const cardElements = printContainerRef.current.querySelectorAll('.printable-card');
    
    // Config
    const cardsPerPage = 8;
    const marginLeft = 10;
    const marginTop = 20;
    const cardW = 90; // mm
    const cardH = 50; // mm
    const gapX = 10; // 10mm horizontal gap
    const gapY = 10; // 10mm vertical gap
    
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
    
    pdf.save(`30-seconds-kaartjes.pdf`);
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
                      <span className="font-mono bg-slate-100 px-3 py-1 rounded text-slate-700 w-12 text-center">
                        {cardCount}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Woorden per kaartje
                    </label>
                    <div className="flex items-center space-x-4">
                      <input 
                        type="range" 
                        min="3" 
                        max="8" 
                        step="1"
                        value={termsPerCard}
                        onChange={(e) => setTermsPerCard(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="font-mono bg-slate-100 px-3 py-1 rounded text-slate-700 w-12 text-center">
                        {termsPerCard}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mt-1">
                      Totaal benodigde begrippen: <span className="font-bold">{cardCount * termsPerCard}</span>
                    </p>
                  </div>
                </div>
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
                    Maak Kaartjes
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
             <h2 className="text-2xl font-bold text-slate-800">Kaartjes maken...</h2>
             <p className="text-slate-500 mt-2">Je begrippen worden door elkaar geschud en op kaartjes gezet.</p>
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
                      maxTerms={termsPerCard}
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