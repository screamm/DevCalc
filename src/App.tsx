import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sun, Moon, Calculator, RotateCw, Github, Copy, Check, History, X, ChevronUp, ChevronDown, Info, Settings, Save, Smartphone, Tablet, Monitor, Minimize2, Maximize2, Keyboard } from "lucide-react";

interface Conversion {
  id: ConversionType;
  label: string;
  category: ConversionCategory;
}

type Unit = 'px' | 'rem' | 'em' | 'vh' | 'vw' | 'vmin' | 'vmax' | 'pt' | 'cm' | 'mm' | '%' | 'in' | 'ch' | 'ex';
type ConversionType = `${Unit}-${Unit}`;
type ConversionCategory = 'Relativa' | 'Absoluta' | 'Viewport' | 'Text';

interface ConversionMap {
  [key: string]: (value: number) => number;
}

interface HistoryItem {
  fromUnit: string;
  toUnit: string;
  fromValue: string;
  toValue: string;
  timestamp: Date;
}

interface UserSettings {
  rootFontSize: number;
  charWidth: number;
  xHeight: number;
  customScreenWidth?: number;
  customScreenHeight?: number;
}

const UnitConverter: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [selectedConversion, setSelectedConversion] = useState<ConversionType>('px-rem');
  const [leftValue, setLeftValue] = useState<string>('');
  const [rightValue, setRightValue] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<ConversionCategory>('Relativa');
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [conversionHistory, setConversionHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  const [userSettings, setUserSettings] = useState<UserSettings>({
    rootFontSize: 16,
    charWidth: 8,
    xHeight: 8,
    customScreenWidth: undefined,
    customScreenHeight: undefined
  });
  const [tempSettings, setTempSettings] = useState<UserSettings>({
    rootFontSize: 16,
    charWidth: 8,
    xHeight: 8,
    customScreenWidth: undefined,
    customScreenHeight: undefined
  });
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewSize, setPreviewSize] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const previewRef = useRef<HTMLDivElement>(null);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState<boolean>(false);
  
  const categories: ConversionCategory[] = ['Relativa', 'Absoluta', 'Viewport', 'Text'];
  
  const conversions: Conversion[] = [
    // Relativa konverteringar
    { id: 'px-rem', label: 'px → rem', category: 'Relativa' },
    { id: 'rem-px', label: 'rem → px', category: 'Relativa' },
    { id: 'px-em', label: 'px → em', category: 'Relativa' },
    { id: 'em-px', label: 'em → px', category: 'Relativa' },
    { id: 'rem-em', label: 'rem → em', category: 'Relativa' },
    { id: 'em-rem', label: 'em → rem', category: 'Relativa' },
    { id: 'px-%', label: 'px → %', category: 'Relativa' },
    { id: '%-px', label: '% → px', category: 'Relativa' },
    
    // Viewport konverteringar
    { id: 'px-vh', label: 'px → vh', category: 'Viewport' },
    { id: 'vh-px', label: 'vh → px', category: 'Viewport' },
    { id: 'px-vw', label: 'px → vw', category: 'Viewport' },
    { id: 'vw-px', label: 'vw → px', category: 'Viewport' },
    { id: 'vw-vh', label: 'vw → vh', category: 'Viewport' },
    { id: 'vh-vw', label: 'vh → vw', category: 'Viewport' },
    { id: 'px-vmin', label: 'px → vmin', category: 'Viewport' },
    { id: 'vmin-px', label: 'vmin → px', category: 'Viewport' },
    { id: 'px-vmax', label: 'px → vmax', category: 'Viewport' },
    { id: 'vmax-px', label: 'vmax → px', category: 'Viewport' },
    
    // Absoluta konverteringar
    { id: 'pt-px', label: 'pt → px', category: 'Absoluta' },
    { id: 'px-pt', label: 'px → pt', category: 'Absoluta' },
    { id: 'cm-px', label: 'cm → px', category: 'Absoluta' },
    { id: 'px-cm', label: 'px → cm', category: 'Absoluta' },
    { id: 'mm-px', label: 'mm → px', category: 'Absoluta' },
    { id: 'px-mm', label: 'px → mm', category: 'Absoluta' },
    { id: 'in-px', label: 'in → px', category: 'Absoluta' },
    { id: 'px-in', label: 'px → in', category: 'Absoluta' },
    
    // Text konverteringar
    { id: 'px-ch', label: 'px → ch', category: 'Text' },
    { id: 'ch-px', label: 'ch → px', category: 'Text' },
    { id: 'px-ex', label: 'px → ex', category: 'Text' },
    { id: 'ex-px', label: 'ex → px', category: 'Text' },
    { id: 'em-ch', label: 'em → ch', category: 'Text' },
    { id: 'ch-em', label: 'ch → em', category: 'Text' },
  ];

  const filteredConversions = conversions.filter(c => c.category === activeCategory);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  
  useEffect(() => {
    // Load user settings
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setUserSettings(parsedSettings);
        setTempSettings(parsedSettings);
      } catch (e) {
        console.error('Error parsing settings from localStorage', e);
      }
    }
    
    // Load history
    const savedHistory = localStorage.getItem('conversionHistory');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        // Convert string timestamps back to Date objects
        const processedHistory = parsedHistory.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        setConversionHistory(processedHistory);
      } catch (e) {
        console.error('Error parsing history from localStorage', e);
      }
    }
  }, []);

  useEffect(() => {
    // Save history to localStorage when it changes
    if (conversionHistory.length > 0) {
      localStorage.setItem('conversionHistory', JSON.stringify(conversionHistory));
    }
  }, [conversionHistory]);

  useEffect(() => {
    // Save settings to localStorage when they change
    localStorage.setItem('userSettings', JSON.stringify(userSettings));
    
    // Recalculate current conversion if there are values
    if (leftValue) {
      const numValue = parseFloat(leftValue);
      const result = convert(numValue, selectedConversion);
      setRightValue(result);
    }
  }, [userSettings]);

  // Tangentbordsnavigering
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Hoppa över om någon modal är öppen eller vi redigerar i ett inputfält
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement ||
        showInfoModal || 
        showSettingsModal || 
        showKeyboardShortcuts
      ) {
        return;
      }
      
      // Snabbkommandon med Ctrl/Cmd
      if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
          case 'c': // Kopiera resultat
            if (rightValue) {
              e.preventDefault();
              handleCopyResult();
            }
            break;
          case 'r': // Återställ värden
            e.preventDefault();
            handleReset();
            break;
          case 'p': // Förhandsvisning
            if (rightValue) {
              e.preventDefault();
              setShowPreview(!showPreview);
            }
            break;
          case 'h': // Toggle historia
            e.preventDefault();
            setShowHistory(!showHistory);
            break;
          case 's': // Visa inställningar
            e.preventDefault();
            setShowSettingsModal(true);
            break;
          case 'i': // Visa information
            e.preventDefault();
            setShowInfoModal(true);
            break;
          case 'k': // Visa kortkommandon
            e.preventDefault();
            setShowKeyboardShortcuts(true);
            break;
          case 'd': // Toggle mörkt/ljust läge
            e.preventDefault();
            setIsDarkMode(!isDarkMode);
            break;
        }
      } else {
        // Enkla genvägstangenter
        switch(e.key) {
          case 'ArrowRight':
            // Byt till nästa konvertering
            e.preventDefault();
            const currentIndex = filteredConversions.findIndex(c => c.id === selectedConversion);
            if (currentIndex < filteredConversions.length - 1) {
              handleConversionSelect(filteredConversions[currentIndex + 1].id);
            }
            break;
          case 'ArrowLeft':
            // Byt till föregående konvertering
            e.preventDefault();
            const prevIndex = filteredConversions.findIndex(c => c.id === selectedConversion);
            if (prevIndex > 0) {
              handleConversionSelect(filteredConversions[prevIndex - 1].id);
            }
            break;
          case 'ArrowUp':
          case 'ArrowDown':
            // Byt kategori
            e.preventDefault();
            const currentCatIndex = categories.indexOf(activeCategory);
            const newIndex = e.key === 'ArrowUp' 
              ? (currentCatIndex - 1 + categories.length) % categories.length
              : (currentCatIndex + 1) % categories.length;
            handleCategorySelect(categories[newIndex]);
            break;
          case '?':
            // Visa kortkommandon
            e.preventDefault();
            setShowKeyboardShortcuts(true);
            break;
          case 'Escape':
            // Stäng modaler eller återställ värden
            if (showInfoModal) {
              setShowInfoModal(false);
            } else if (showSettingsModal) {
              setShowSettingsModal(false);
            } else if (showKeyboardShortcuts) {
              setShowKeyboardShortcuts(false);
            } else if (showPreview) {
              setShowPreview(false);
            } else if (showHistory) {
              setShowHistory(false);
            } else if (leftValue || rightValue) {
              handleReset();
            }
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    leftValue, 
    rightValue, 
    selectedConversion, 
    activeCategory, 
    filteredConversions, 
    showPreview, 
    showHistory, 
    showInfoModal, 
    showSettingsModal,
    showKeyboardShortcuts,
    isDarkMode
  ]);

  const handleChange = (e: MediaQueryListEvent) => {
    setIsDarkMode(e.matches);
  };

  const getConversionFunctions = (): ConversionMap => {
    const rootFontSize = userSettings.rootFontSize;
    const charWidth = userSettings.charWidth;
    const xHeight = userSettings.xHeight;
    const screenWidth = userSettings.customScreenWidth || window.innerWidth;
    const screenHeight = userSettings.customScreenHeight || window.innerHeight;
    const screenMin = Math.min(screenWidth, screenHeight);
    const screenMax = Math.max(screenWidth, screenHeight);
    
    return {
      // Relativa konverteringar
      'px-rem': (value: number) => value / rootFontSize,
      'rem-px': (value: number) => value * rootFontSize,
      'px-em': (value: number) => value / rootFontSize,
      'em-px': (value: number) => value * rootFontSize,
      'rem-em': (value: number) => value,
      'em-rem': (value: number) => value,
      'px-%': (value: number) => (value / screenWidth) * 100,
      '%-px': (value: number) => (value * screenWidth) / 100,
      
      // Viewport konverteringar
      'px-vh': (value: number) => (value / screenHeight) * 100,
      'vh-px': (value: number) => (value * screenHeight) / 100,
      'px-vw': (value: number) => (value / screenWidth) * 100,
      'vw-px': (value: number) => (value * screenWidth) / 100,
      'vw-vh': (value: number) => (value * screenWidth) / screenHeight,
      'vh-vw': (value: number) => (value * screenHeight) / screenWidth,
      'px-vmin': (value: number) => (value / screenMin) * 100,
      'vmin-px': (value: number) => (value * screenMin) / 100,
      'px-vmax': (value: number) => (value / screenMax) * 100,
      'vmax-px': (value: number) => (value * screenMax) / 100,
      
      // Absoluta konverteringar
      'pt-px': (value: number) => value * (96 / 72),
      'px-pt': (value: number) => value * (72 / 96),
      'cm-px': (value: number) => value * (96 / 2.54),
      'px-cm': (value: number) => value / (96 / 2.54),
      'mm-px': (value: number) => value * (96 / 25.4),
      'px-mm': (value: number) => value / (96 / 25.4),
      'in-px': (value: number) => value * 96,
      'px-in': (value: number) => value / 96,
      
      // Text konverteringar
      'px-ch': (value: number) => value / charWidth,
      'ch-px': (value: number) => value * charWidth,
      'px-ex': (value: number) => value / xHeight,
      'ex-px': (value: number) => value * xHeight,
      'em-ch': (value: number) => (value * rootFontSize) / charWidth,
      'ch-em': (value: number) => (value * charWidth) / rootFontSize,
    };
  };

  const convert = (value: number, conversion: string): string => {
    setIsCalculating(true);
    const conversions = getConversionFunctions();
    const conversionFn = conversions[conversion];
    
    if (!conversionFn) return '0';
    
    // Simulera en kort beräkningstid
    setTimeout(() => {
      setIsCalculating(false);
    }, 300);
    
    return conversionFn(value).toFixed(4);
  };

  const handleLeftValueChange = (value: string): void => {
    setLeftValue(value);
    
    if (value === '') {
      setRightValue('');
      return;
    }

    setIsCalculating(true);
    
    const numValue = parseFloat(value);
    const result = convert(numValue, selectedConversion);
    
    setRightValue(result);
    setIsCalculating(false);
    
    // Add to history if both values are valid
    if (value && result) {
      const [fromUnit, toUnit] = selectedConversion.split('-');
      
      // Only add to history if the values changed
      const newHistoryItem: HistoryItem = {
        fromUnit,
        toUnit,
        fromValue: value,
        toValue: result,
        timestamp: new Date()
      };
      
      // Check if this conversion is already in history
      const exists = conversionHistory.some(
        item => item.fromUnit === fromUnit && 
               item.toUnit === toUnit && 
               item.fromValue === value && 
               item.toValue === result
      );
      
      if (!exists) {
        // Limit history to last 10 items
        setConversionHistory(prev => [newHistoryItem, ...prev].slice(0, 10));
      }
    }
  };

  const handleRightValueChange = (value: string): void => {
    setRightValue(value);
    
    if (value === '') {
      setLeftValue('');
      return;
    }

    setIsCalculating(true);
    
    const numValue = parseFloat(value);
    const [fromUnit, toUnit] = selectedConversion.split('-');
    const reverseConversion = `${toUnit}-${fromUnit}` as ConversionType;
    
    const result = convert(numValue, reverseConversion);
    
    setLeftValue(result);
    setIsCalculating(false);
    
    // Add to history if both values are valid
    if (value && result) {
      // Only add to history if the values changed
      const newHistoryItem: HistoryItem = {
        fromUnit: toUnit,
        toUnit: fromUnit,
        fromValue: value,
        toValue: result,
        timestamp: new Date()
      };
      
      // Check if this conversion is already in history
      const exists = conversionHistory.some(
        item => item.fromUnit === toUnit && 
               item.toUnit === fromUnit && 
               item.fromValue === value && 
               item.toValue === result
      );
      
      if (!exists) {
        // Limit history to last 10 items
        setConversionHistory(prev => [newHistoryItem, ...prev].slice(0, 10));
      }
    }
  };

  const handleConversionSelect = (conversion: ConversionType): void => {
    setSelectedConversion(conversion);
    
    // If there are values, update the calculation
    if (leftValue) {
      const numValue = parseFloat(leftValue);
      const result = convert(numValue, conversion);
      setRightValue(result);
    }
  };

  const handleCategorySelect = (category: ConversionCategory): void => {
    setActiveCategory(category);
    
    // Select the first conversion in this category
    const firstConversion = conversions.find(c => c.category === category);
    if (firstConversion) {
      setSelectedConversion(firstConversion.id);
      
      // Recalculate if there's a value
      if (leftValue) {
        const numValue = parseFloat(leftValue);
        const result = convert(numValue, firstConversion.id);
        setRightValue(result);
      }
    }
  };

  const handleReset = (): void => {
    setLeftValue('');
    setRightValue('');
  };

  const handleCopyResult = (): void => {
    if (rightValue) {
      navigator.clipboard.writeText(rightValue);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };
  
  const applyHistoryItem = (item: HistoryItem): void => {
    // Create the conversion type
    const conversion = `${item.fromUnit}-${item.toUnit}` as ConversionType;
    
    // Find the category for this conversion
    const conversionObj = conversions.find(c => c.id === conversion);
    if (conversionObj) {
      setActiveCategory(conversionObj.category);
      setSelectedConversion(conversion);
      setLeftValue(item.fromValue);
      setRightValue(item.toValue);
    }
  };
  
  const clearHistory = (): void => {
    setConversionHistory([]);
    localStorage.removeItem('conversionHistory');
  };

  const handleSaveSettings = (): void => {
    setUserSettings(tempSettings);
    setShowSettingsModal(false);
  };

  const resetSettings = (): void => {
    const defaultSettings = {
      rootFontSize: 16,
      charWidth: 8,
      xHeight: 8,
      customScreenWidth: undefined,
      customScreenHeight: undefined
    };
    setTempSettings(defaultSettings);
  };

  // Funktion för att få preview-storlek
  const getPreviewSize = (): { width: number, height: number, label: string } => {
    switch(previewSize) {
      case 'mobile':
        return { width: 375, height: 667, label: 'Mobil (375x667)' };
      case 'tablet':
        return { width: 768, height: 1024, label: 'Surfplatta (768x1024)' };
      case 'desktop':
        return { width: 1440, height: 900, label: 'Dator (1440x900)' };
    }
  };
  
  // Funktion för att rendera ett exempelelement med de konverterade måtten
  const renderPreviewElement = (): React.ReactNode => {
    if (!leftValue || !rightValue) return null;
    
    const [fromUnit, toUnit] = selectedConversion.split('-');
    const value = rightValue;
    
    // Skapa en stil baserad på den konverterade enheten
    const getStyle = (): React.CSSProperties => {
      const previewDimensions = getPreviewSize();
      
      // Standardstil
      const baseStyle: React.CSSProperties = {
        backgroundColor: 'rgba(14, 165, 233, 0.7)',
        color: 'white',
        padding: '8px',
        borderRadius: '4px',
        fontWeight: 'bold',
        textAlign: 'center',
        position: 'relative',
        fontSize: '14px',
        transition: 'all 0.3s ease',
      };
      
      const valueWithUnit = `${value}${toUnit}`;
      
      // Specialfall för olika enheter
      switch(toUnit) {
        case 'px':
          return { ...baseStyle, width: `${value}px`, height: '40px', lineHeight: '24px' };
        case 'rem':
        case 'em':
          return { ...baseStyle, width: valueWithUnit, height: valueWithUnit, lineHeight: valueWithUnit };
        case '%':
          return { ...baseStyle, width: valueWithUnit, height: '40px', lineHeight: '24px' };
        case 'vh':
          return { ...baseStyle, height: valueWithUnit, width: '100px', lineHeight: 'normal', display: 'flex', alignItems: 'center', justifyContent: 'center' };
        case 'vw':
          return { ...baseStyle, width: valueWithUnit, height: '40px', lineHeight: '24px' };
        case 'vmin':
        case 'vmax':
          return { ...baseStyle, width: valueWithUnit, height: valueWithUnit, lineHeight: 'normal', display: 'flex', alignItems: 'center', justifyContent: 'center' };
        case 'ch':
        case 'ex':
          return { ...baseStyle, width: valueWithUnit, height: '40px', lineHeight: '24px' };
        default:
          return { ...baseStyle, width: '100px', height: '40px', lineHeight: '24px' };
      }
    };
    
    return (
      <div style={getStyle()}>
        {value}{toUnit}
      </div>
    );
  };

  return (
    <div className="app-container w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-3xl mx-auto card hover-lift m-4">
        <div className="card-content">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center text-primary-600 dark:text-primary-400 subtle-hover">
              <Calculator className="w-6 h-6 mr-2" />
              <h1 className="text-lg font-bold">DevCalc</h1>
            </div>
            <div className="flex space-x-3 items-center">
              <button 
                onClick={() => setShowKeyboardShortcuts(true)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-gray-500 dark:text-gray-400 subtle-hover"
                aria-label="Visa tangentbordsgenvägar"
                title="Visa tangentbordsgenvägar"
              >
                <Keyboard className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-gray-500 dark:text-gray-400 subtle-hover"
                aria-label={isDarkMode ? "Byt till ljust läge" : "Byt till mörkt läge"}
                title={isDarkMode ? "Byt till ljust läge" : "Byt till mörkt läge"}
              >
                {isDarkMode ? 
                  <Sun className="w-5 h-5 text-amber-400" /> : 
                  <Moon className="w-5 h-5 text-gray-600" />
                }
              </button>
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-gray-500 dark:text-gray-400 subtle-hover"
                aria-label="Inställningar"
                title="Inställningar"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setShowInfoModal(true)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-gray-500 dark:text-gray-400 subtle-hover"
                aria-label="Visa information"
                title="Visa information"
              >
                <Info className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-gray-500 dark:text-gray-400 subtle-hover ${showHistory ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
                aria-label={showHistory ? "Dölj historik" : "Visa historik"}
                title={showHistory ? "Dölj historik" : "Visa historik"}
              >
                <History className="w-5 h-5" />
              </button>
              <button 
                onClick={handleReset}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-all hover:rotate-180 duration-500 text-gray-500 dark:text-gray-400"
                aria-label="Återställ värden"
                title="Återställ värden"
              >
                <RotateCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          <h2 className="text-center mb-6 md:mb-8 animate-pulse-subtle">
            CSS Enhetskonverterare
          </h2>
          
          {showHistory && (
            <div className="mb-6 bg-gray-50/80 dark:bg-gray-800/80 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700 overflow-hidden fade-in">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Senaste konverteringar</h3>
                <button 
                  onClick={clearHistory} 
                  className="text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400 subtle-hover"
                  aria-label="Rensa historik"
                >
                  Rensa historik
                </button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {conversionHistory.length > 0 ? (
                  conversionHistory.map((item, index) => (
                    <button 
                      key={index}
                      onClick={() => applyHistoryItem(item)}
                      className="w-full text-left p-2 text-xs sm:text-sm bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex justify-between items-center subtle-hover"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <span>
                        <span className="font-medium">{item.fromValue}</span> {item.fromUnit} → <span className="font-medium">{item.toValue}</span> {item.toUnit}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                    Ingen historik än. Gör några konverteringar för att spara dem här.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="tab-container">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => handleCategorySelect(category)}
                className={`btn-tab ${
                  activeCategory === category ? 'btn-tab-active' : 'btn-tab-inactive'
                }`}
                aria-pressed={activeCategory === category}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="conversion-grid">
            {filteredConversions.map(({ id, label }, index) => (
              <button
                key={id}
                onClick={() => handleConversionSelect(id)}
                className={`btn-unit ${
                  selectedConversion === id ? 'btn-unit-active' : 'btn-unit-inactive'
                }`}
                aria-pressed={selectedConversion === id}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="conversion-form">
            <div className="input-group pop-in" style={{ animationDelay: '100ms' }}>
              <label className="input-label">
                {selectedConversion.split('-')[0]}
              </label>
              <input
                type="number"
                value={leftValue}
                onChange={(e) => handleLeftValueChange(e.target.value)}
                className="input-field text-right"
                placeholder="0"
                aria-label={`Ange värde i ${selectedConversion.split('-')[0]}`}
              />
            </div>

            <div className="flex items-center justify-center relative pop-in" style={{ animationDelay: '200ms' }}>
              <span className={`equals-sign ${isCalculating ? 'animate-pulse' : ''}`}>=</span>
            </div>

            <div className="input-group relative pop-in" style={{ animationDelay: '300ms' }}>
              <label className="input-label flex justify-between">
                <span>{selectedConversion.split('-')[1]}</span>
                <div className="flex space-x-2">
                  {rightValue && (
                    <>
                      <button 
                        onClick={() => setShowPreview(!showPreview)} 
                        className={`text-gray-500 hover:text-primary-500 dark:hover:text-primary-400 transition-colors ${showPreview ? 'text-primary-500 dark:text-primary-400' : ''}`}
                        aria-label={showPreview ? "Dölj förhandsgranskning" : "Visa förhandsgranskning"}
                        title={showPreview ? "Dölj förhandsgranskning" : "Visa förhandsgranskning"}
                      >
                        {showPreview ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={handleCopyResult} 
                        className="text-gray-500 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                        aria-label="Kopiera resultat"
                        title="Kopiera resultat"
                      >
                        {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </>
                  )}
                </div>
              </label>
              <input
                type="number"
                value={rightValue}
                onChange={(e) => handleRightValueChange(e.target.value)}
                className="input-field"
                placeholder="0"
                aria-label={`Ange värde i ${selectedConversion.split('-')[1]}`}
              />
            </div>
          </div>
          
          {/* Förhandsgranskningssektion */}
          {showPreview && rightValue && (
            <div className="mt-6 bg-gray-50/80 dark:bg-gray-800/80 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700 overflow-hidden fade-in">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Förhandsgranskning</h3>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setPreviewSize('mobile')}
                    className={`p-1.5 rounded-md transition-colors ${previewSize === 'mobile' ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    aria-label="Visa mobilvy"
                    title="Visa mobilvy"
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setPreviewSize('tablet')}
                    className={`p-1.5 rounded-md transition-colors ${previewSize === 'tablet' ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    aria-label="Visa surfplattvy"
                    title="Visa surfplattvy"
                  >
                    <Tablet className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setPreviewSize('desktop')}
                    className={`p-1.5 rounded-md transition-colors ${previewSize === 'desktop' ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    aria-label="Visa datorskärmsvy"
                    title="Visa datorskärmsvy"
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col items-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {getPreviewSize().label}
                </p>
                
                <div 
                  ref={previewRef}
                  className="preview-container bg-white dark:bg-gray-900 overflow-hidden border border-gray-300 dark:border-gray-600 relative rounded-lg"
                  style={{
                    width: `${Math.min(getPreviewSize().width, 320)}px`,
                    height: `${Math.min(getPreviewSize().height, 240)}px`,
                    transform: `scale(${isMobile ? 0.8 : 1})`,
                    margin: isMobile ? '-20px 0' : '0'
                  }}
                >
                  <div className="preview-content absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    {renderPreviewElement()}
                  </div>
                  <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    1:{getPreviewSize().width > 320 ? Math.round(getPreviewSize().width / 320) : 1}
                  </div>
                </div>
                
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                  OBS: Förhandsvisningen är skalad. Faktiska mått kan variera mellan enheter.
                </p>
              </div>
            </div>
          )}

          <div className="footer-text">
            <p>
              Alla konverteringar är baserade på följande värden:<br />
              <span className="text-primary-600 dark:text-primary-400 font-medium">root font-size {userSettings.rootFontSize}px</span>, 
              <span className="text-primary-600 dark:text-primary-400 font-medium"> skärmbredd {userSettings.customScreenWidth || window.innerWidth}px</span>, 
              <span className="text-primary-600 dark:text-primary-400 font-medium"> skärmhöjd {userSettings.customScreenHeight || window.innerHeight}px</span>
            </p>
            <div className="flex justify-center mt-3">
              <a 
                href="https://github.com/your-username/devcalc" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 subtle-hover"
              >
                <Github className="w-4 h-4 mr-1" />
                <span className="text-xs">DevCalc på GitHub</span>
              </a>
            </div>
          </div>
        </div>
      </div>
      
      {/* Info modal */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 modal-backdrop">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto modal-content">
            <div className="p-5 sm:p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Om DevCalc</h3>
                <button 
                  onClick={() => setShowInfoModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 subtle-hover"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                <p>
                  DevCalc är ett verktyg för att konvertera mellan olika CSS-enheter. Det är utvecklat för att hjälpa webbutvecklare att snabbt och enkelt konvertera värden mellan olika måttenheter.
                </p>
                
                <h4 className="font-medium text-gray-900 dark:text-white">Enhetstyper</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Relativa enheter:</strong> rem, em, %, relaterar till andra värden</li>
                  <li><strong>Absoluta enheter:</strong> px, pt, cm, mm, in, absoluta mått</li>
                  <li><strong>Viewport enheter:</strong> vh, vw, vmin, vmax, relaterar till viewportens storlek</li>
                  <li><strong>Text enheter:</strong> ch, ex, relaterar till textegenskaper</li>
                </ul>
                
                <h4 className="font-medium text-gray-900 dark:text-white">Funktioner</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Konvertera mellan alla vanliga CSS-enheter</li>
                  <li>Spara konverteringshistorik</li>
                  <li>Ljust/mörkt läge</li>
                  <li>Kopiera resultat med ett klick</li>
                </ul>
              </div>
              
              <button 
                onClick={() => setShowInfoModal(false)}
                className="mt-6 w-full py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors subtle-hover"
              >
                Stäng
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Settings modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 modal-backdrop">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto modal-content">
            <div className="p-5 sm:p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Inställningar</h3>
                <button 
                  onClick={() => setShowSettingsModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 subtle-hover"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Root font-size (px)
                  </label>
                  <input 
                    type="number" 
                    value={tempSettings.rootFontSize}
                    onChange={(e) => setTempSettings({...tempSettings, rootFontSize: parseInt(e.target.value) || 16})}
                    className="input-field"
                    min="1"
                    max="100"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Teckens bredd (px) för ch-enheten
                  </label>
                  <input 
                    type="number" 
                    value={tempSettings.charWidth}
                    onChange={(e) => setTempSettings({...tempSettings, charWidth: parseInt(e.target.value) || 8})}
                    className="input-field"
                    min="1"
                    max="30"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    x-höjd (px) för ex-enheten
                  </label>
                  <input 
                    type="number" 
                    value={tempSettings.xHeight}
                    onChange={(e) => setTempSettings({...tempSettings, xHeight: parseInt(e.target.value) || 8})}
                    className="input-field"
                    min="1"
                    max="30"
                  />
                </div>
                
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Anpassad skärmstorlek</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Ange egna värden för viewport-baserade enheter eller lämna tomt för att använda din aktuella skärmstorlek.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Skärmbredd (px)
                      </label>
                      <input 
                        type="number" 
                        value={tempSettings.customScreenWidth || ''}
                        onChange={(e) => setTempSettings({
                          ...tempSettings, 
                          customScreenWidth: e.target.value ? parseInt(e.target.value) : undefined
                        })}
                        placeholder={window.innerWidth.toString()}
                        className="input-field"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Skärmhöjd (px)
                      </label>
                      <input 
                        type="number" 
                        value={tempSettings.customScreenHeight || ''}
                        onChange={(e) => setTempSettings({
                          ...tempSettings, 
                          customScreenHeight: e.target.value ? parseInt(e.target.value) : undefined
                        })}
                        placeholder={window.innerHeight.toString()}
                        className="input-field"
                        min="1"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between mt-6 space-x-3">
                <button 
                  onClick={resetSettings}
                  className="py-2 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors subtle-hover"
                >
                  Återställ
                </button>
                <button 
                  onClick={handleSaveSettings}
                  className="flex-1 py-2 px-4 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors subtle-hover flex items-center justify-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Spara inställningar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Tangentbordsgenvägar modal */}
      {showKeyboardShortcuts && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 modal-backdrop">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto modal-content">
            <div className="p-5 sm:p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                  <Keyboard className="w-5 h-5 mr-2" />
                  Tangentbordsgenvägar
                </h3>
                <button 
                  onClick={() => setShowKeyboardShortcuts(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 subtle-hover"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Navigering</h4>
                  <ul className="space-y-1.5 text-sm">
                    <li className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Växla mellan konverteringar</span>
                      <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 rounded text-gray-800 dark:text-gray-200">← →</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Byta mellan kategorier</span>
                      <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 rounded text-gray-800 dark:text-gray-200">↑ ↓</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Stäng dialogen</span>
                      <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 rounded text-gray-800 dark:text-gray-200">Esc</span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Åtgärder (Ctrl/Cmd + ...)</h4>
                  <ul className="space-y-1.5 text-sm">
                    <li className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Kopiera resultat</span>
                      <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 rounded text-gray-800 dark:text-gray-200">C</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Återställ värden</span>
                      <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 rounded text-gray-800 dark:text-gray-200">R</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Visa/dölj förhandsvisning</span>
                      <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 rounded text-gray-800 dark:text-gray-200">P</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Visa/dölj historik</span>
                      <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 rounded text-gray-800 dark:text-gray-200">H</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Öppna inställningar</span>
                      <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 rounded text-gray-800 dark:text-gray-200">S</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Visa information</span>
                      <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 rounded text-gray-800 dark:text-gray-200">I</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Byt tema</span>
                      <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 rounded text-gray-800 dark:text-gray-200">D</span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Andra kommandon</h4>
                  <ul className="space-y-1.5 text-sm">
                    <li className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Visa denna guide</span>
                      <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 rounded text-gray-800 dark:text-gray-200">?</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <button 
                onClick={() => setShowKeyboardShortcuts(false)}
                className="mt-6 w-full py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors subtle-hover"
              >
                Stäng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitConverter; 