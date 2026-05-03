'use client';
import { createContext, useContext } from 'react';

export const dict = {
  EN: {
    // General
    welcome: "Welcome",
    student: "Student",
    id: "ID",
    liveNotice: "Live Notice",
    rank: "Rank",
    syllabus: "Syllabus",
    trackProgress: "Track Progress",
    support: "Support",
    whatsappGroup: "WhatsApp Group",
    altumLab: "Altum Lab",
    altumCore: "Altum Core",
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

    // Profile & Attendance & Performance
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
    welcome: "स्वागत है",
    student: "छात्र",
    id: "आईडी",
    liveNotice: "ताज़ा सूचना",
    rank: "रैंक",
    syllabus: "पाठ्यक्रम",
    trackProgress: "प्रगति देखें",
    support: "सहायता",
    whatsappGroup: "व्हाट्सएप ग्रुप",
    altumLab: "अल्टम लैब",
    altumCore: "अल्टम कोर",
    performanceMode: "प्रदर्शन मोड",
    launchLab: "लैब शुरू करें",
    standard: "स्टैंडर्ड",

    // Leaderboard
    dashboard: "डैशबोर्ड",
    hallOf: "हॉल ऑफ",
    fame: "फेम",
    classRankings: "कक्षा रैंकिंग",
    calculatingGreatness: "महानता की गणना हो रही है...",
    aggregate: "कुल प्रतिशत",
    rankingsUpdate: "हर परीक्षा के बाद रैंकिंग अपडेट होती है।",
    keepPushing: "लगातार प्रयास करें",
    numberOneSpot: "#1 स्थान के लिए",

    // AI Chat
    altuGreeting: "नमस्ते! मैं अल्टू हूँ। क्या आज आपको विज्ञान या अंग्रेजी में मदद चाहिए?",
    networkError: "नेटवर्क त्रुटि। कृपया पुनः प्रयास करें! 🦊",
    altuThinking: "अल्टू सोच रहा है...",
    altuProcessing: "अल्टू प्रोसेस कर रहा है...",
    typeDoubt: "अपना डाउट टाइप करें...",

    // Login
    portalAccess: "पोर्टल एक्सेस",
    studentId: "छात्र आईडी",
    launchCore: "लॉन्च कोर",
    help: "सहायता",
    contactAdmin: "एडमिन से संपर्क करें",
    getHelpWhatsApp: "व्हाट्सएप पर सहायता प्राप्त करें",

    // Materials / Vault
    study: "स्टडी",
    vault: "वॉल्ट",
    digitalLibraryNode: "डिजिटल लाइब्रेरी नोड",
    searchStandard: "स्टैंडर्ड खोजें...",
    backToHub: "हब पर वापस जाएँ",
    classWord: "कक्षा",
    selectSubjectVault: "विषय वॉल्ट चुनें",
    coreResources: "मुख्य संसाधन",
    backTo: "वापस जाएँ",
    resources: "संसाधन",
    openingVault: "वॉल्ट खुल रहा है...",
    noFilesUploaded: "अभी तक कोई फ़ाइल अपलोड नहीं की गई है।",

    // Profile & Attendance & Performance
    nodeId: "नोड आईडी",
    attendance: "उपस्थिति",
    consistencyPulse: "निरंतरता पल्स",
    performance: "प्रदर्शन",
    academicLedger: "शैक्षणिक लेज़र",
    my: "मेरा",
    record: "रिकॉर्ड",
    verifiedId: "सत्यापित आईडी",
    present: "उपस्थित",
    absent: "अनुपस्थित",
    holiday: "अवकाश",
    profile: "प्रोफ़ाइल",
    aggregateScore: "कुल स्कोर",
    status: "स्थिति",
    activeLedger: "सक्रिय लेज़र",
    recentTests: "हाल के टेस्ट",
    mockFinals: "मॉक फाइनल्स",
    nextMilestone: "अगला पड़ाव",

    // Syllabus
    backToDashboard: "डैशबोर्ड पर वापस जाएँ",
    pulse: "पल्स",
    progress: "प्रगति",
    readingCloudData: "क्लाउड डेटा पढ़ रहा है",
    noChaptersAdded: "इसके लिए कोई अध्याय नहीं जोड़ा गया:",
    mathematics: "गणित",
    science: "विज्ञान",
    english: "अंग्रेज़ी",
    socialstudies: "सामाजिक विज्ञान"
  }
};

export const LanguageContext = createContext({
  lang: 'EN',
  t: (key: string) => key,
  toggleLang: () => {} // <-- Added this
});

export const useLanguage = () => useContext(LanguageContext);
