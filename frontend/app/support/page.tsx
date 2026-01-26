'use client';

import { useState, useRef } from 'react';
import { toast } from 'react-hot-toast'; 

export default function SupportPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  
  // Image Upload State
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploading(true);
    const toastId = toast.loading("Uploading screenshot..."); 

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json();
      if (data.url) {
          setImageUrl(data.url);
          toast.success("Screenshot attached! 📷", { id: toastId }); 
      } else {
          throw new Error("No URL returned");
      }
    } catch (error) {
      console.error("Upload failed", error);
      toast.error("Image upload failed. Try again.", { id: toastId }); 
    } finally {
      setUploading(false);
    }
  };

  const handleSendSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return toast.error("Please fill in the title and message."); 

    setStatus('sending');
    const toastId = toast.loading("Sending ticket...");

    try {
        const response = await fetch("https://formsubmit.co/ajax/hello@polypulsebets.com", {
            method: "POST",
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                _subject: `⚠️ Support Ticket: ${title}`,
                Title: title,
                Message: message,
                Image_Attachment: imageUrl || "No Image Attached",
                _template: "table",
                _captcha: "false"
            })
        });

        if (response.ok) {
            setStatus('success');
            setTitle('');
            setMessage('');
            setImageUrl('');
            toast.success("Ticket created! We'll be in touch. 📨", { id: toastId }); 
        } else {
            setStatus('error');
            toast.error("Failed to send ticket. Please try again.", { id: toastId }); 
        }
    } catch (error) {
        console.error(error);
        setStatus('error');
        toast.error("Network error. Please try again.", { id: toastId }); 
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans flex flex-col w-full">
      
      <div className="flex flex-1 items-center justify-center p-4 md:p-6 pb-32">
        <div className="max-w-xl w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="mb-8 text-center md:text-left">
                <h1 className="text-3xl font-bold text-white mb-2">🛠️ Support Center</h1>
                <p className="text-slate-400">Found a bug or need help? Let us know.</p>
            </div>

            <div className="p-6 md:p-8 rounded-3xl border shadow-2xl bg-slate-900 border-slate-800">
                {status === 'success' ? (
                    <div className="text-center py-10">
                        <div className="text-5xl mb-4">📨</div>
                        <h3 className="text-2xl font-bold text-white mb-2">Message Received!</h3>
                        <p className="text-slate-400 mb-6">Our team will check your ticket shortly.</p>
                        <button onClick={() => setStatus('idle')} className="text-blue-500 hover:text-blue-400 font-bold">Open another ticket?</button>
                    </div>
                ) : (
                    <form onSubmit={handleSendSupport} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">Issue Title</label>
                            <input value={title} onChange={(e) => setTitle(e.target.value)} type="text" placeholder="e.g. Cannot claim winnings" className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-blue-500" />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">Message</label>
                            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your problem in detail..." className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-blue-500 h-32 resize-none" />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">Screenshot (Optional)</label>
                            {!imageUrl ? (
                                <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${uploading ? 'border-blue-500 bg-blue-900/10' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'}`}>
                                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                    {uploading ? <div className="text-blue-400 font-bold animate-pulse">Uploading...</div> : <><div className="text-2xl mb-1">📷</div><p className="text-xs text-slate-400">Click to upload screenshot</p></>}
                                </div>
                            ) : (
                                <div className="relative group p-2 border border-slate-700 rounded-xl bg-slate-950">
                                    <img src={imageUrl} className="w-full h-32 object-contain rounded-lg" />
                                    <button type="button" onClick={() => setImageUrl('')} className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-lg text-xs font-bold shadow-lg">✕</button>
                                </div>
                            )}
                        </div>

                        <button 
                            disabled={status === 'sending' || uploading}
                            className={`w-full py-4 font-bold rounded-xl border transition-all flex items-center justify-center gap-2 ${
                                (status === 'sending' || uploading)
                                ? 'bg-slate-800 text-slate-500 border-slate-800 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-600 shadow-lg shadow-blue-900/20'
                            }`}
                        >
                            {status === 'sending' ? "Sending..." : "Submit Ticket"}
                        </button>
                        
                    </form>
                )}
                <div className="text-center mt-6 text-slate-500 text-xs">
                Having trouble? You can also email us directly at <br/>
                <span className="text-blue-500 font-bold">hello@polypulsebets.com</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}