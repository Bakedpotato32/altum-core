'use client';
import { createContext, useContext, useState, useEffect } from 'react';

export const dict = {
  EN: {
    // General
    welcome: "Welcome",
    student: "Student",
    id: "ID",
    liveNotice: "Live Notice",
    update: "Update",
    rank: "Rank",
    syllabus: "Syllabus",
    trackProgress: "Track Progress",
    support: "Support",
    whatsappGroup: "WhatsApp Group",
    altumLab: "Altum Lab",
    altumCore: "Winner's Academy", 
    performanceMode: "Performance Mode",
    launchLab: "Launch Lab",
    standard: "Standard",
    
    // Leaderboard
    dashboard: "Dashboard",
    hallOf: "Hall of",
    fame: "Fame",
    classRankings: "Class Rankings",
    calculatingGreatness: "Calculating Greatness...",
    aggregate: "Aggregate",
    rankingsUpdate: "Rankings update after every test.",
    keepPushing: "Keep pushing for the",
    numberOneSpot: "#1 Spot",
    unbeatable: "Unbeatable",
    noTestData: "No test data available yet.",

    // AI Chat
    altuGreeting: "HI THERE! I'M ALTU. NEED HELP WITH SCIENCE OR ENGLISH TODAY?",
    networkError: "NETWORK ERROR. PLEASE TRY AGAIN! 🦊",
    altuThinking: "Altu is thinking...",
    altuProcessing: "ALTU IS PROCESSING...",
    typeDoubt: "TYPE YOUR DOUBT...",

    // Login
    portalAccess: "Portal Access",
    studentId: "STUDENT ID",
    launchCore: "Launch Core",
    help: "Help",
    contactAdmin: "Contact Admin",
    getHelpWhatsApp: "Get help on WhatsApp",

    // Materials / Vault
    study: "Study",
    vault: "Vault",
    digitalLibraryNode: "Digital Library Node",
    searchStandard: "Search Standard...",
    backToHub: "Back to Hub",
    classWord: "Class",
    selectSubjectVault: "Select Subject Vault",
    coreResources: "Core Resources",
    backTo: "Back to",
    resources: "Resources",
    openingVault: "Opening Vault...",
    noFilesUploaded: "No files uploaded yet.",

    // Profile & Attendance
    nodeId: "Node ID",
    attendance: "Attendance",
    consistencyPulse: "Consistency Pulse",
    performance: "Performance",
    academicLedger: "Academic Ledger",
    my: "My",
    record: "Record",
    verifiedId: "Verified ID",
    present: "Present",
    absent: "Absent",
    holiday: "Holiday",
    profile: "Profile",
    aggregateScore: "Aggregate Score",
    status: "Status",
    activeLedger: "Active Ledger",
    recentTests: "Recent Tests",
    mockFinals: "Mock Finals",
    nextMilestone: "Next Milestone",

    // Finance Node (NEW)
    feeDiary: "Fee Diary",
    financeNode: "Finance Node",
    paidTill: "Paid Till",
    dueSoon: "Due Soon",
    overdue: "Overdue",
    actionNeeded: "Action Needed",
    pending: "PENDING",
    currentStatus: "Current Status",
    cleared: "Cleared",
    paymentHistory: "Payment History",
    noPaymentRecords: "No payment records found.",
    overdueSince: "Overdue since",
    pendingFor: "Pending for",
    month: "Month",
    months: "Months",

    // Syllabus
    backToDashboard: "Back to Dashboard",
    pulse: "Pulse",
    progress: "Progress",
    readingCloudData: "Reading Cloud Data",
    noChaptersAdded: "No chapters added for",
    mathematics: "Mathematics",
    science: "Science",
    english: "English",
    socialstudies: "Social Studies"
  },
  HI: {
    // General
    welcome: "वेलकम",
    student: "स्टूडेंट",
    id: "ID",
    liveNotice: "ज़रूरी नोटिस",
    update: "अपडेट",
    rank: "रैंक",
    syllabus: "सिलेबस",
    trackProgress: "पढ़ाई का रिकॉर्ड",
    support: "सपोर्ट",
    whatsappGroup: "व्हाट्सएप ग्रुप",
    altumLab: "AI डाउट सॉल्वर",
    altumCore: "विनर्स अकादमी", 
    performanceMode: "फास्ट मोड",
    launchLab: "लैब खोलें",
    standard: "क्लास",

    // Leaderboard
    dashboard: "होम",
    hallOf: "हॉल ऑफ",
    fame: "फेम",
    classRankings: "क्लास की रैंकिंग",
    calculatingGreatness: "रैंक निकाली जा रही है...",
    aggregate: "टोटल %",
    rankingsUpdate: "हर टेस्ट के बाद रैंक अपडेट होती है।",
    keepPushing: "मेहनत करते रहो",
    numberOneSpot: "नंबर 1 बनने के लिए",
    unbeatable: "सबसे आगे",
    noTestData: "अभी कोई टेस्ट का डेटा नहीं है।",

    // AI Chat
    altuGreeting: "नमस्ते! मैं अल्टू हूँ। आज साइंस या इंग्लिश में कोई डाउट है?",
    networkError: "नेटवर्क प्रॉब्लम है। फिर से कोशिश करें! 🦊",
    altuThinking: "अल्टू सोच रहा है...",
    altuProcessing: "जवाब ढूंढा जा रहा है...",
    typeDoubt: "अपना डाउट यहाँ लिखें...",

    // Login
    portalAccess: "स्टूडेंट लॉगिन",
    studentId: "स्टूडेंट ID",
    launchCore: "लॉगिन करें",
    help: "मदद",
    contactAdmin: "एडमिन से बात करें",
    getHelpWhatsApp: "व्हाट्सएप पर मदद लें",

    // Materials / Vault
    study: "स्टडी",
    vault: "वॉल्ट",
    digitalLibraryNode: "डिजिटल लाइब्रेरी",
    searchStandard: "क्लास खोजें...",
    backToHub: "पीछे जाएँ",
    classWord: "क्लास",
    selectSubjectVault: "सब्जेक्ट चुनें",
    coreResources: "स्टडी मटेरियल",
    backTo: "पीछे जाएँ",
    resources: "नोट्स",
    openingVault: "नोट्स खुल रहे हैं...",
    noFilesUploaded: "अभी कोई फाइल नहीं डाली गई है।",

    // Profile & Attendance
    nodeId: "स्टूडेंट ID",
    attendance: "हाज़िरी",
    consistencyPulse: "हाज़िरी का रिकॉर्ड",
    performance: "परफॉरमेंस",
    academicLedger: "टेस्ट के नंबर",
    my: "मेरा",
    record: "रिकॉर्ड",
    verifiedId: "वेरिफाइड ID",
    present: "प्रेजेंट (P)",
    absent: "एब्सेंट (A)",
    holiday: "छुट्टी",
    profile: "प्रोफाइल",
    aggregateScore: "टोटल स्कोर",
    status: "स्टेटस",
    activeLedger: "एक्टिव रिकॉर्ड",
    recentTests: "पिछले टेस्ट",
    mockFinals: "मॉक टेस्ट",
    nextMilestone: "अगला टारगेट",

    // Finance Node (NEW)
    feeDiary: "फीस डायरी",
    financeNode: "फीस का रिकॉर्ड",
    paidTill: "फीस जमा है",
    dueSoon: "फीस का समय",
    overdue: "फीस बाकी है",
    actionNeeded: "तुरंत ध्यान दें",
    pending: "बाकी है",
    currentStatus: "करंट स्टेटस",
    cleared: "जमा है",
    paymentHistory: "पिछली जमा फीस",
    noPaymentRecords: "अभी तक कोई फीस जमा नहीं हुई है।",
    overdueSince: "महीने से बाकी:",
    pendingFor: "इतने समय से बाकी:",
    month: "महीने",
    months: "महीने",

    // Syllabus
    backToDashboard: "होम पर जाएँ",
    pulse: "स्टेटस",
    progress: "प्रोग्रेस",
    readingCloudData: "डेटा लोड हो रहा है...",
    noChaptersAdded: "अभी चैप्टर नहीं जोड़े गए हैं:",
    mathematics: "गणित",
    science: "विज्ञान",
    english: "अंग्रेज़ी",
    socialstudies: "सामाजिक विज्ञान"
  }
};

const defaultContext = {
  lang: 'EN',
  t: (key: string) => key,
  toggleLang: () => {}
};

export const LanguageContext = createContext(defaultContext);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLang] = useState<'EN' | 'HI'>('EN');

  useEffect(() => {
    const savedLang = localStorage.getItem('app_lang') as 'EN' | 'HI';
    if (savedLang) setLang(savedLang);
  }, []);

  const toggleLang = () => {
    const newLang = lang === 'EN' ? 'HI' : 'EN';
    setLang(newLang);
    localStorage.setItem('app_lang', newLang);
  };

  const t = (key: string) => {
    return dict[lang]?.[key as keyof typeof dict['EN']] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
