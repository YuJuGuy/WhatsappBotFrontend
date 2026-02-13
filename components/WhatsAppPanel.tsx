'use client';

import { useState, useEffect } from 'react';

const typingPhrases = [
    'أرسل رسائل جماعية لعملائي',
    'أتمتة الردود على الاستفسارات',
    'إدارة المحادثات بسهولة',
    'جدولة الرسائل مسبقاً',
];

// Chat bubble component with flip support
function ChatBubble({
    message,
    time,
    isOutgoing = false
}: {
    message: string;
    time: string;
    isOutgoing?: boolean;
}) {
    return (
        <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-1`}>
            <div className="relative">
                {/* Bubble tail */}
                <div
                    className={`absolute top-0 w-3 h-3 ${isOutgoing
                            ? 'right-[-6px] bg-[#d9fdd3]'
                            : 'left-[-6px] bg-white'
                        }`}
                    style={{
                        clipPath: isOutgoing
                            ? 'polygon(0 0, 100% 0, 0 100%)'
                            : 'polygon(100% 0, 0 0, 100% 100%)'
                    }}
                />
                {/* Bubble content */}
                <div
                    className={`
                        relative max-w-[280px] px-[9px] py-[6px] rounded-[7.5px] shadow-sm
                        ${isOutgoing
                            ? 'bg-[#d9fdd3]'
                            : 'bg-white'
                        }
                    `}
                    dir="rtl"
                >
                    <p className="text-[#111b21] text-[14.2px] leading-[19px]">{message}</p>
                    <div className="flex items-center gap-1 mt-1 justify-end" dir="ltr">
                        <span className="text-[11px] text-[#667781]">{time}</span>
                        {isOutgoing && (
                            <svg className="w-[18px] h-[18px] text-[#53bdeb]" viewBox="0 0 16 11" fill="currentColor">
                                <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.405-2.272a.463.463 0 0 0-.336-.136.474.474 0 0 0-.344.144.467.467 0 0 0 .009.653l2.761 2.608a.474.474 0 0 0 .65-.009l6.57-8.09a.453.453 0 0 0-.03-.61z" />
                                <path d="M14.757.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.036-.978a.457.457 0 0 0-.096.606l.548.518a.474.474 0 0 0 .65-.009l6.57-8.09a.453.453 0 0 0-.03-.61z" />
                            </svg>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Typing animation component
function TypingInput() {
    const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
    const [displayedText, setDisplayedText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const currentPhrase = typingPhrases[currentPhraseIndex];

        const timeout = setTimeout(() => {
            if (!isDeleting) {
                if (displayedText.length < currentPhrase.length) {
                    setDisplayedText(currentPhrase.slice(0, displayedText.length + 1));
                } else {
                    setTimeout(() => setIsDeleting(true), 2000);
                }
            } else {
                if (displayedText.length > 0) {
                    setDisplayedText(displayedText.slice(0, -1));
                } else {
                    setIsDeleting(false);
                    setCurrentPhraseIndex((prev) => (prev + 1) % typingPhrases.length);
                }
            }
        }, isDeleting ? 30 : 80);

        return () => clearTimeout(timeout);
    }, [displayedText, isDeleting, currentPhraseIndex]);

    return (
        <div className="p-4">
            <div className="w-full bg-[#f0f2f5] rounded-4xl px-4 py-2 flex items-center gap-3">
                <button className="w-10 h-10 rounded-full flex items-center justify-center text-[#54656f] hover:bg-[#d9dbdf] transition-colors">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                </button>
                <button className="w-10 h-10 rounded-full flex items-center justify-center text-[#54656f] hover:bg-[#d9dbdf] transition-colors">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                    </svg>
                </button>
                <div className="flex-1 bg-white rounded-lg px-4 py-2.5 min-h-[42px] flex items-center" dir="rtl">
                    <span className="text-[#3b4a54] text-[15px]">
                        {displayedText}
                    </span>
                    <span className="typing-cursor" />
                </div>
                <button className="w-10 h-10 rounded-full flex items-center justify-center text-[#54656f] hover:bg-[#d9dbdf] transition-colors">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default function WhatsAppPanel() {
    return (
        <div className="hidden lg:flex lg:flex-col w-1/2 gradient-panel justify-end">
            {/* Chat bubbles area */}
            <div className="flex-1 flex flex-col justify-end p-4 pb-0">
                <ChatBubble
                    message="مرحباً، هل يمكنكم مساعدتي؟"
                    time="12:30"
                    isOutgoing={false}
                />
                <ChatBubble
                    message="أهلاً! كيف يمكننا مساعدتك؟ 👋"
                    time="12:31"
                    isOutgoing={true}
                />
                <ChatBubble
                    message="أحتاج بوت لأتمتة رسائل الواتساب"
                    time="12:31"
                    isOutgoing={false}
                />
            </div>

            {/* Input bar */}
            <TypingInput />
        </div>
    );
}
