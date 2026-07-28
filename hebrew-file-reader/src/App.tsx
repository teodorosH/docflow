import React, { useState, useMemo } from 'react';
import Groq from 'groq-sdk';

// הדבק כאן את המפתח החינמי מ-Groq
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;;

const groq = new Groq({ apiKey: GROQ_API_KEY, dangerouslyAllowBrowser: true });

export default function App() {
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);

  const [censoredWords, setCensoredWords] = useState(['חשבון', 'סכום', 'פרטי']);
  const [newWord, setNewWord] = useState('');

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

 const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setRawText('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      // שליחה לשרת ה-Python המקומי ב-localhost
      const response = await fetch('http://127.0.0.1:8000/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('שגיאה בתקשורת עם שרת ה-OCR הלוקאלי');
      }

      const data = await response.json();
      setRawText(data.text || 'לא זוהה טקסט בתמונה.');
    } catch (error) {
      console.error('שגיאה בסריקה:', error);
      setRawText('אירעה שגיאה בזיהוי התמונה. ודא ששרת ה-Python רץ ברקע.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newWord.trim();
    if (trimmed && !censoredWords.includes(trimmed)) {
      setCensoredWords([...censoredWords, trimmed]);
      setNewWord('');
    }
  };

  const handleRemoveWord = (wordToRemove: string) => {
    setCensoredWords(censoredWords.filter((w) => w !== wordToRemove));
  };

  const processedText = useMemo(() => {
    if (!rawText) return '';
    let text = rawText;

    censoredWords.forEach((word) => {
      if (!word) return;
      const regex = new RegExp(word, 'gi');
      const stars = '*'.repeat(word.length);
      text = text.replace(regex, stars);
    });

    return text;
  }, [rawText, censoredWords]);

  return (
    <div style={{ direction: 'rtl', maxWidth: '750px', margin: '40px auto', padding: '20px', fontFamily: 'system-ui, sans-serif', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h2>סורק תמונות AI בעברית 🤖🔒</h2>
      <p style={{ color: '#666' }}>בחר תמונה (JPG, PNG) לחילוץ הטקסט בעברית וצינזורו:</p>
      
      <div style={{ backgroundColor: '#f0f4f8', padding: '15px', borderRadius: '6px', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0' }}>מילים מוגדרות לצינזור:</h4>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {censoredWords.map((word) => (
            <span key={word} style={{ backgroundColor: '#e0e0e0', padding: '4px 8px', borderRadius: '12px', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {word}
              <button onClick={() => handleRemoveWord(word)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ff4d4d', fontWeight: 'bold' }}>✕</button>
            </span>
          ))}
        </div>
        <form onSubmit={handleAddWord} style={{ display: 'flex', gap: '8px' }}>
          <input type="text" placeholder="הוסף מילה לצינזור..." value={newWord} onChange={(e) => setNewWord(e.target.value)} style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', flex: 1 }} />
          <button type="submit" style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', backgroundColor: '#0066cc', color: '#fff', cursor: 'pointer' }}>הוסף</button>
        </form>
      </div>

      <input type="file" accept="image/*.pdf" onChange={handleFileUpload} disabled={loading} style={{ margin: '10px 0', cursor: 'pointer' }} />

      {loading && <p style={{ color: '#e67e22', fontWeight: 'bold' }}>⏳ סורק ומחלץ את הטקסט...</p>}
      {fileName && !loading && <p style={{ fontWeight: 'bold' }}>📄 תמונה שנבחרה: <span style={{ color: '#0066cc' }}>{fileName}</span></p>}

      {processedText && (
        <div style={{ marginTop: '20px' }}>
          <h3>תוכן שחולץ מהתמונה (מצונזר):</h3>
          <pre style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '6px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', textAlign: 'right', fontSize: '15px', border: '1px solid #eee', maxHeight: '400px', overflowY: 'auto' }}>
            {processedText}
          </pre>
        </div>
      )}
    </div>
  );
}