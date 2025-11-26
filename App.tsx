import React, { useState, useRef } from 'react';
import { AppState, GameCard } from './types';
import { DEFAULT_TERMS_PER_CARD, DEFAULT_CARD_COUNT } from './constants';
import { CardPreview } from './components/CardPreview';
import { Button } from './components/Button';
import { Upload, Copy, Settings, RotateCcw, Sparkles, Download, Palette, Wand2, Info } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { expandTermList } from './services/geminiService';

export default function App() {
  // State
  const [appState, setAppState] = useState<AppState>(AppState.INPUT);
  const [cardTitle, setCardTitle] = useState('30 Seconds');
  const [categoryLabel, setCategoryLabel] = useState('');
  const [manualText, setManualText] = useState('');
  const [cardCount, setCardCount] = useState(DEFAULT_CARD_COUNT);
  const [termsPerCard, setTermsPerCard] = useState(DEFAULT_TERMS_PER_CARD);
  const [useAiFill, setUseAiFill] = useState(true);
  const [cards, setCards] = useState<GameCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Even geduld...');
  
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
    setLoadingMessage('Begrippen verwerken...');

    try {
      let terms: string[] = [];
      
      // 1. Parse manual text
      if (manualText.trim()) {
        terms = manualText
          .split(/[\n,]+/)
          .map(t => t.trim())
          .filter(t => t.length > 0);
      }

      if (terms.length === 0) {
        throw new Error("Voer tenminste één begrip in om te beginnen.");
      }

      const neededTerms = cardCount * termsPerCard;
      
      // 2. Logic: AI Expansion if needed
      if (terms.length < neededTerms && useAiFill) {
         setLoadingMessage(`AI vult ${neededTerms - terms.length} begrippen aan...`);
         // Call Gemini service to fill the gap
         const expandedTerms = await expandTermList(terms, neededTerms);
         terms = expandedTerms;
      }

      // 3. Validation after potential AI expansion
      if (terms.length < neededTerms) {
          throw new Error(`Te weinig begrippen. Nodig: ${neededTerms}. Je hebt er: ${terms.length}. ${useAiFill ? 'De AI kon niet genoeg aanvullen.' : 'Zet "AI Auto-aanvullen" aan of voeg meer woorden toe.'}`);
      }

      // 4. Shuffle terms
      const shuffled = [...terms].sort(() => 0.5 - Math.random());

      // 5. Create Cards
      const newCards: GameCard[] = [];
      for (let i = 0; i < cardCount; i++) {
        const start = i * termsPerCard;
        const cardTerms = shuffled.slice(start, start + termsPerCard);
        
        // Safety check (should be covered by validation)
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
    <div className="min-h-screen pb-12 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 font-sans text-slate-800">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-white/50 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 group cursor-default">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black rounded-xl p-2 shadow-lg shadow-blue-200 transform group-hover:rotate-6 transition-transform">
              30s
            </div>
            <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              Kaartjesmaker
            </h1>
          </div>
          <div className="flex items-center space-x-4">
             {appState === AppState.PREVIEW && (
                <Button 
                   variant="outline" 
                   onClick={() => setAppState(AppState.INPUT)}
                   className="rounded-full"
                   icon={<RotateCcw size={16} />}
                >
                  Opnieuw
                </Button>
             )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Error Message */}
        {error && (
          <div className="mb-8 bg-red-50 border-2 border-red-100 text-red-700 px-6 py-4 rounded-2xl flex items-center shadow-sm animate-fade-in">
             <span className="mr-3 text-2xl">👉</span> 
             <span className="font-medium">{error}</span>
          </div>
        )}

        {/* INPUT VIEW */}
        {appState === AppState.INPUT && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            
            {/* Left Column: Settings */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white/90 backdrop-blur rounded-3xl p-6 border border-white/50 shadow-xl shadow-purple-100/50">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                  <Settings className="w-6 h-6 mr-2 text-indigo-500" />
                  Instellingen
                </h2>
                
                <div className="space-y-6">
                  {/* Card Appearance */}
                  <div className="bg-indigo-50/50 rounded-2xl p-4 space-y-4">
                    <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-2">Opmaak</h3>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                        Titel (zijkant)
                        </label>
                        <input 
                        type="text" 
                        value={cardTitle}
                        onChange={(e) => setCardTitle(e.target.value)}
                        placeholder="30 Seconds"
                        className="w-full px-4 py-2 bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-all"
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
                        placeholder="Bijv. Geschiedenis"
                        className="w-full px-4 py-2 bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-all"
                        />
                    </div>
                  </div>

                  {/* Game Rules */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-2">Spelregels</h3>
                    
                    <div>
                      <div className="flex justify-between items-center mb-1">
                         <label className="text-sm font-medium text-slate-700">Aantal kaartjes</label>
                         <span className="bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-lg text-sm">{cardCount}</span>
                      </div>
                      <input 
                        type="range" 
                        min="4" 
                        max="40" 
                        step="4"
                        value={cardCount}
                        onChange={(e) => setCardCount(parseInt(e.target.value))}
                        className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                         <label className="text-sm font-medium text-slate-700">Woorden per kaart</label>
                         <span className="bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-lg text-sm">{termsPerCard}</span>
                      </div>
                      <input 
                        type="range" 
                        min="3" 
                        max="8" 
                        step="1"
                        value={termsPerCard}
                        onChange={(e) => setTermsPerCard(parseInt(e.target.value))}
                        className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>

                  {/* AI Toggle */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100">
                     <label className="flex items-start space-x-3 cursor-pointer">
                        <div className="flex items-center h-5">
                          <input 
                            type="checkbox" 
                            checked={useAiFill}
                            onChange={(e) => setUseAiFill(e.target.checked)}
                            className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                        </div>
                        <div className="text-sm">
                          <span className="font-bold text-slate-800 flex items-center">
                            <Wand2 className="w-4 h-4 mr-1 text-purple-600"/>
                            AI Auto-aanvullen
                          </span>
                          <p className="text-slate-600 mt-1 text-xs">
                            Te weinig woorden? AI verzint er automatisch extra woorden bij in hetzelfde thema.
                          </p>
                        </div>
                     </label>
                  </div>

                  <div className="pt-2 text-center">
                    <p className="text-xs font-medium text-slate-400 bg-slate-50 inline-block px-3 py-1 rounded-full">
                      Totaal nodig: {cardCount * termsPerCard} woorden
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Input */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white/90 backdrop-blur rounded-3xl p-6 lg:p-8 border border-white/50 shadow-xl shadow-blue-100/50 h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center">
                    <Copy className="w-6 h-6 mr-2 text-blue-500" />
                    Jouw Woordenlijst
                    </h2>
                    <button 
                       onClick={() => fileInputRef.current?.click()}
                       className="flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
                     >
                        <Upload className="w-4 h-4 mr-2" />
                        Uploaden
                     </button>
                     <input 
                        type="file" 
                        ref={fileInputRef}
                        accept=".txt,.csv"
                        className="hidden"
                        onChange={handleFileUpload}
                     />
                </div>

                <div className="flex-1 flex flex-col space-y-3 relative">
                  <textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder={`Typ of plak hier je woorden...\n\nAppel\nPeer\nBanaan\n...`}
                    className="flex-1 w-full min-h-[300px] px-6 py-6 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none resize-none font-medium text-base text-slate-700 leading-relaxed transition-all placeholder:text-slate-400"
                  />
                  <div className="absolute bottom-4 right-4 text-xs font-bold text-slate-400 bg-white/80 px-2 py-1 rounded-lg backdrop-blur">
                    {manualText.split(/[\n,]+/).filter(t => t.trim().length > 0).length} woorden ingevoerd
                  </div>
                </div>

                <div className="mt-8">
                  <Button 
                    onClick={processInputAndGenerate} 
                    className="w-full h-14 text-xl rounded-2xl shadow-blue-300 shadow-lg hover:shadow-blue-400 hover:-translate-y-1 transition-all duration-300"
                    icon={<Sparkles className="w-6 h-6 animate-pulse" />}
                  >
                    Maak mijn kaartjes!
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LOADING STATE */}
        {appState === AppState.GENERATING && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
             <div className="relative">
                 <div className="w-24 h-24 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-indigo-600" />
                 </div>
             </div>
             <h2 className="text-3xl font-black text-slate-800 mt-8 mb-2">Even wachten...</h2>
             <p className="text-lg text-slate-500 font-medium">{loadingMessage}</p>
          </div>
        )}

        {/* PREVIEW VIEW */}
        {appState === AppState.PREVIEW && (
          <div className="animate-fade-in space-y-8">
            <div className="bg-white/80 backdrop-blur rounded-3xl p-6 border border-white/50 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start space-x-4">
                 <div className="bg-green-100 p-3 rounded-2xl text-green-600">
                    <Sparkles className="w-8 h-8" />
                 </div>
                 <div>
                    <h2 className="text-2xl font-bold text-slate-800">Yes! {cards.length} kaartjes gemaakt.</h2>
                    <p className="text-slate-600">Klaar om te printen en te spelen.</p>
                 </div>
              </div>
              <div className="flex space-x-3">
                 <Button 
                   variant="primary" 
                   onClick={generatePDF} 
                   className="rounded-xl px-8 text-lg h-12 shadow-blue-200 shadow-lg"
                   icon={<Download size={20} />}
                 >
                   Download PDF
                 </Button>
              </div>
            </div>

            {/* Customization Toolbar */}
            <div className="bg-indigo-50/80 rounded-2xl p-4 border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center text-indigo-800 font-bold px-2">
                    <Palette className="w-5 h-5 mr-2" />
                    Last-minute aanpassingen:
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full sm:w-auto">
                    <div className="bg-white rounded-xl px-3 py-2 border border-indigo-100 flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400 uppercase">Titel</span>
                        <input 
                            type="text" 
                            value={cardTitle}
                            onChange={(e) => setCardTitle(e.target.value)}
                            className="flex-1 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-300"
                            placeholder="30 Seconds"
                        />
                    </div>
                    <div className="bg-white rounded-xl px-3 py-2 border border-indigo-100 flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400 uppercase">Categorie</span>
                        <input 
                            type="text" 
                            value={categoryLabel}
                            onChange={(e) => setCategoryLabel(e.target.value)}
                            className="flex-1 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-300"
                            placeholder="Automatisch"
                        />
                    </div>
                </div>
            </div>

            {/* Print Container (Visible in UI, used for canvas generation) */}
            <div className="bg-white rounded-3xl p-8 lg:p-12 shadow-2xl shadow-slate-200/50 overflow-hidden">
               <div className="overflow-x-auto pb-4">
                 <div 
                   ref={printContainerRef} 
                   className="grid grid-cols-1 md:grid-cols-2 gap-8 mx-auto"
                   style={{ width: 'fit-content', minWidth: 'min-content' }} 
                 >
                    {cards.map((card, idx) => (
                      <CardPreview 
                        key={card.id} 
                        card={card} 
                        index={idx} 
                        title={cardTitle}
                        category={categoryLabel}
                        maxTerms={termsPerCard}
                        className="printable-card shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300" 
                      />
                    ))}
                 </div>
               </div>
            </div>
            
            <p className="text-center text-indigo-300 mt-8 font-medium flex items-center justify-center gap-2">
               <Info className="w-4 h-4" />
               Tip: Print op ware grootte (100%) voor het beste resultaat.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}