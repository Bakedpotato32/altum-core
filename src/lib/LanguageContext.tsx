'use client';
import { createContext, useContext } from 'react';

// Using natural, spoken "Street Hindi / Hinglish" mixed with your custom translations
export const dict = {
  EN: {
    // Login
    portalAccess: "PORTAL ACCESS",
    studentId: "ENTER STUDENT ID",
    launchCore: "LAUNCH CORE",
    contactAdmin: "CONTACT ADMIN",
    getHelpWhatsApp: "GET HELP ON WHATSAPP",
    
    // Dashboard Core
    welcomeBack: "WELCOME BACK",
    schoolNotice: "SCHOOL NOTICE",
    classUpdate: "CLASS UPDATE",
    
    // Main Hub Cards
    kidsHub: "KIDS HUB",
    playLearn: "PLAY & LEARN",
    feeDiary: "FEE DIARY",
    paymentsDues: "PAYMENTS & DUES",
    learningLab: "LEARNING LAB",
    smartTools: "SMART TOOLS & SOLVERS",
    trackProgress: "TRACK PROGRESS",
    syllabus: "SYLLABUS & CURRICULUM",
    helpGroup: "HELP GROUP",
    studentSupport: "STUDENT SUPPORT",
    altumArcade: "ALTUM ARCADE",
    miniGames: "EDUCATIONAL MINI GAMES",
    rank: "RANK",
    hallOfFame: "HALL OF FAME",
    
    // Materials & Syllabus
    backToHub: "BACK TO HUB",
    selectSubject: "SELECT SUBJECT VAULT",
    digitalMaterial: "DIGITAL MATERIAL VAULT",
    progress: "PROGRESS",
    done: "DONE",
    noChapters: "NO CHAPTERS ADDED FOR",
    
    // Fee Diary
    financeNode: "FINANCE NODE",
    currentStatus: "CURRENT STATUS",
    actionNeeded: "ACTION NEEDED",
    paymentHistory: "PAYMENT HISTORY",
    noPaymentRecords: "NO PAYMENT RECORDS FOUND.",
    pending: "PENDING",
    paid: "PAID",
    
    // Kids Hub
    exitZone: "EXIT ZONE",
    letsPlay: "LET'S PLAY!",
    pickAdventure: "PICK A LEARNING ADVENTURE",
    abcCards: "TALKING FLASHCARDS",
    countAnimals: "COUNT THE ANIMALS",
    watchLearn: "WATCH & LEARN",
    colors: "COLORS",
    
    // Learning Lab Subtexts
    searchSolvers: "Search solvers... (e.g. Kinematics)",
    stepByStep: "STEP-BY-STEP SOLVER",
    visualEquation: "VISUAL EQUATION TOOLS",
    areaVolume: "AREA & VOLUME VISUALIZER",
    ratiosTriangles: "RATIOS & TRIANGLES",
    
    // Leaderboard
    unbeatable: "UNBEATABLE",
    studentsRanked: "STUDENTS RANKED",
    
    // Profile
    profile: "PROFILE",
    nodeId: "NODE ID",
    attendance: "ATTENDANCE",
    consistencyPulse: "CONSISTENCY PULSE",
    performance: "PERFORMANCE",
    academicLedger: "ACADEMIC LEDGER",

    // Attendance Page
    verifiedId: "VERIFIED ID",
    my: "MY",
    record: "RECORD",
    present: "PRESENT",
    absent: "ABSENT",
    holiday: "HOLIDAY",
    percent: "PERCENT",
  },
  HI: {
    // Login
    portalAccess: "पोर्टल एक्सेस",
    studentId: "अपनी स्टूडेंट ID डालें",
    launchCore: "लॉगिन करें",
    contactAdmin: "करन सर से बात करें",
    getHelpWhatsApp: "व्हाट्सएप पर मदद लें",

    // Dashboard Core
    welcomeBack: "वापस स्वागत है",
    schoolNotice: "स्कूल नोटिस",
    classUpdate: "क्लास अपडेट",

    // Main Hub Cards
    kidsHub: "बच्चो की दुनिया",
    playLearn: "खेलो और सीखो",
    feeDiary: "फीस की डायरी",
    paymentsDues: "पेमेंट और बकाया",
    learningLab: "सीखने का कक्ष",
    smartTools: "स्मार्ट टूल और सॉल्वर",
    trackProgress: "प्रोग्रेस चेक करें",
    syllabus: "सिलेबस",
    helpGroup: "हेल्प ग्रुप",
    studentSupport: "स्टूडेंट सपोर्ट",
    altumArcade: "गेमिंग आर्केड",
    miniGames: "एजुकेशनल गेम्स",
    rank: "रैंक",
    hallOfFame: "प्रसिद्धता की सूची",

    // Materials & Syllabus
    backToHub: "हब पर वापस",
    selectSubject: "सब्जेक्ट चुनें",
    digitalMaterial: "डिजिटल नोट्स",
    progress: "प्रोग्रेस",
    done: "पूरा हुआ",
    noChapters: "इसके लिए कोई चैप्टर नहीं है:",

    // Fee Diary
    financeNode: "फाइनेंस सेक्शन",
    currentStatus: "करंट स्टेटस",
    actionNeeded: "एक्शन जरूरी है",
    paymentHistory: "पेमेंट हिस्ट्री",
    noPaymentRecords: "कोई पेमेंट रिकॉर्ड नहीं मिला।",
    pending: "पेंडिंग (बाकी है)",
    paid: "जमा है",

    // Kids Hub
    exitZone: "बाहर निकलें",
    letsPlay: "चलो खेलें!",
    pickAdventure: "एक सीखने का रोमांच चुनो",
    abcCards: "बोलने वाले फ्लैशकार्ड",
    countAnimals: "जानवरो को गिनो",
    watchLearn: "देखो और सीखो",
    colors: "रंग पहचानें",

    // Learning Lab Subtexts
    searchSolvers: "सॉल्वर खोजें... (जैसे Kinematics)",
    stepByStep: "स्टेप-बाय-स्टेप सॉल्वर",
    visualEquation: "विज़ुअल इक्वेशन टूल्स",
    areaVolume: "एरिया और वॉल्यूम टूल",
    ratiosTriangles: "रेश्यो और ट्राइएंगल्स",

    // Leaderboard
    unbeatable: "सबसे आगे",
    studentsRanked: "स्टूडेंट्स की रैंक",

    // Profile
    profile: "प्रोफाइल",
    nodeId: "नोड ID",
    attendance: "अटेंडेंस (हाजिरी)",
    consistencyPulse: "कंसिस्टेंसी रिकॉर्ड",
    performance: "परफॉरमेंस",
    academicLedger: "अकादमिक रिकॉर्ड",

    // Attendance Page
    verifiedId: "वेरिफाइड ID",
    my: "मेरा",
    record: "रिकॉर्ड",
    present: "प्रेजेंट (आया था)",
    absent: "एब्सेंट (नहीं आया)",
    holiday: "छुट्टी",
    percent: "परसेंटेज",
  }
};

export const LanguageContext = createContext({
  lang: 'EN',
  t: (key: keyof typeof dict.EN) => dict.EN[key] || key,
  toggleLang: () => {},
});

export const useLanguage = () => useContext(LanguageContext);
