// ============================================================
// LanguageContext.jsx
// Chemin : frontend/src/context/LanguageContext.jsx
//
// Contexte global de langue pour toute l'application EVENT.
// Fournit :
//   - langue        : code actif ('fr' | 'en' | 'ar' | 'ar-tn')
//   - setLangue()   : changer la langue + sauvegarder localStorage
//   - t()           : fonction de traduction par clé
//   - isRTL         : true si arabe (direction droite-gauche)
//
// Usage dans n'importe quelle page :
//   import { useLanguage } from '../context/LanguageContext';
//   const { t, langue, setLangue, isRTL } = useLanguage();
//   <h1>{t('login')}</h1>
// ============================================================

import React, { createContext, useContext, useState, useEffect } from 'react';

// ── Toutes les traductions de l'application ──────────────────
const translations = {

    // ════════════════════════════════
    // FRANÇAIS
    // ════════════════════════════════
    fr: {
        // App général
        appName: 'EVENT',
        tagline: 'Votre plateforme sportive',

        // Sélection de langue
        chooseLanguage: 'Choisissez votre langue',

        // Login
        username: "Nom d'utilisateur ou Email",
        password: 'Mot de passe',
        login: 'Entrer',
        noAccount: 'Pas encore de compte ?',
        register: "S'inscrire",
        forgotPassword: 'Mot de passe oublié ?',

        // Register
        firstName: 'Prénom',
        lastName: 'Nom de famille',
        email: 'Adresse email',
        phone: 'Numéro de téléphone',
        birthDate: 'Date de naissance',
        role: 'Rôle',
        roleSportif: 'Sportif',
        roleOrganisateur: 'Organisateur',
        roleSpectateur: 'Spectateur',
        profilePhoto: 'Photo de profil',
        confirmPassword: 'Confirmer le mot de passe',
        createAccount: 'Créer mon compte',
        alreadyAccount: 'Déjà un compte ?',
        backToLogin: 'Retour à la connexion',

        // Forgot Password
        resetPassword: 'Réinitialiser le mot de passe',
        resetInstruction: 'Entrez votre email pour recevoir un lien de réinitialisation.',
        sendResetLink: 'Envoyer le lien',
        emailSent: 'Email envoyé !',
        emailSentDetail: 'Vérifiez votre boîte mail et cliquez sur le lien reçu.',

        // Navigation bas de page (Login)
        aboutOrg: "Découvrir l'organisme",
        aboutApp: "Découvrir l'application",
        ourLocation: 'Notre localisation',

        // About Org
        aboutOrgTitle: "À propos de l'organisme",
        mission: 'Notre mission',
        vision: 'Notre vision',
        team: 'Notre équipe',
        partners: 'Nos partenaires',
        history: 'Notre histoire',

        // About App
        aboutAppTitle: "À propos de l'application",
        features: 'Fonctionnalités',
        howItWorks: 'Comment ça marche ?',
        version: 'Version',
        downloadApp: "Télécharger l'app",

        // Location
        locationTitle: 'Notre localisation',
        address: 'Adresse',
        openingHours: "Horaires d'ouverture",
        contact: 'Contact',
        getDirections: 'Itinéraire',
        callUs: 'Nous appeler',
        emailUs: 'Nous écrire',

        // Messages communs
        errorRequired: 'Tous les champs obligatoires doivent être remplis.',
        errorEmail: "Format d'email invalide.",
        errorPasswordMatch: 'Les mots de passe ne correspondent pas.',
        errorPasswordLen: 'Le mot de passe doit contenir au moins 6 caractères.',
        loading: 'Chargement...',
        sending: 'Envoi en cours...',
        success: 'Succès !',
        error: 'Une erreur est survenue.',
        comingSoon: 'Bientôt disponible',
        underConstruction: 'Page en construction',
    },

    // ════════════════════════════════
    // ENGLISH
    // ════════════════════════════════
    en: {
        appName: 'EVENT',
        tagline: 'Your sports platform',
        chooseLanguage: 'Choose your language',
        username: 'Username or Email',
        password: 'Password',
        login: 'Enter',
        noAccount: 'No account yet?',
        register: 'Sign Up',
        forgotPassword: 'Forgot password?',
        firstName: 'First name',
        lastName: 'Last name',
        email: 'Email address',
        phone: 'Phone number',
        birthDate: 'Date of birth',
        role: 'Role',
        roleSportif: 'Athlete',
        roleOrganisateur: 'Organizer',
        roleSpectateur: 'Spectator',
        profilePhoto: 'Profile photo',
        confirmPassword: 'Confirm password',
        createAccount: 'Create account',
        alreadyAccount: 'Already have an account?',
        backToLogin: 'Back to login',
        resetPassword: 'Reset password',
        resetInstruction: 'Enter your email to receive a reset link.',
        sendResetLink: 'Send reset link',
        emailSent: 'Email sent!',
        emailSentDetail: 'Check your inbox and click the link received.',
        aboutOrg: 'About Us',
        aboutApp: 'About the App',
        ourLocation: 'Our Location',
        aboutOrgTitle: 'About the organization',
        mission: 'Our mission',
        vision: 'Our vision',
        team: 'Our team',
        partners: 'Our partners',
        history: 'Our history',
        aboutAppTitle: 'About the app',
        features: 'Features',
        howItWorks: 'How it works',
        version: 'Version',
        downloadApp: 'Download the app',
        locationTitle: 'Our location',
        address: 'Address',
        openingHours: 'Opening hours',
        contact: 'Contact',
        getDirections: 'Get directions',
        callUs: 'Call us',
        emailUs: 'Email us',
        errorRequired: 'All required fields must be filled.',
        errorEmail: 'Invalid email format.',
        errorPasswordMatch: 'Passwords do not match.',
        errorPasswordLen: 'Password must be at least 6 characters.',
        loading: 'Loading...',
        sending: 'Sending...',
        success: 'Success!',
        error: 'An error occurred.',
        comingSoon: 'Coming soon',
        underConstruction: 'Page under construction',
    },

    // ════════════════════════════════
    // ARABE STANDARD (RTL)
    // ════════════════════════════════
    ar: {
        appName: 'EVENT',
        tagline: 'منصتك الرياضية',
        chooseLanguage: 'اختر لغتك',
        username: 'اسم المستخدم أو البريد الإلكتروني',
        password: 'كلمة المرور',
        login: 'دخول',
        noAccount: 'ليس لديك حساب؟',
        register: 'التسجيل',
        forgotPassword: 'نسيت كلمة السر؟',
        firstName: 'الاسم الأول',
        lastName: 'اسم العائلة',
        email: 'البريد الإلكتروني',
        phone: 'رقم الهاتف',
        birthDate: 'تاريخ الميلاد',
        role: 'الدور',
        roleSportif: 'رياضي',
        roleOrganisateur: 'منظم',
        roleSpectateur: 'متفرج',
        profilePhoto: 'صورة الملف الشخصي',
        confirmPassword: 'تأكيد كلمة المرور',
        createAccount: 'إنشاء حساب',
        alreadyAccount: 'لديك حساب بالفعل؟',
        backToLogin: 'العودة إلى تسجيل الدخول',
        resetPassword: 'إعادة تعيين كلمة المرور',
        resetInstruction: 'أدخل بريدك الإلكتروني لتلقي رابط إعادة التعيين.',
        sendResetLink: 'إرسال الرابط',
        emailSent: 'تم إرسال البريد الإلكتروني!',
        emailSentDetail: 'تحقق من صندوق الوارد الخاص بك.',
        aboutOrg: 'تعرف على المنظمة',
        aboutApp: 'اكتشف التطبيق',
        ourLocation: 'موقعنا',
        aboutOrgTitle: 'حول المنظمة',
        mission: 'مهمتنا',
        vision: 'رؤيتنا',
        team: 'فريقنا',
        partners: 'شركاؤنا',
        history: 'تاريخنا',
        aboutAppTitle: 'حول التطبيق',
        features: 'الميزات',
        howItWorks: 'كيف يعمل؟',
        version: 'الإصدار',
        downloadApp: 'تحميل التطبيق',
        locationTitle: 'موقعنا',
        address: 'العنوان',
        openingHours: 'ساعات العمل',
        contact: 'التواصل',
        getDirections: 'الحصول على الاتجاهات',
        callUs: 'اتصل بنا',
        emailUs: 'راسلنا',
        errorRequired: 'يجب ملء جميع الحقول الإلزامية.',
        errorEmail: 'تنسيق البريد الإلكتروني غير صالح.',
        errorPasswordMatch: 'كلمات المرور غير متطابقة.',
        errorPasswordLen: 'يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل.',
        loading: 'جاري التحميل...',
        sending: 'جاري الإرسال...',
        success: 'تم بنجاح!',
        error: 'حدث خطأ ما.',
        comingSoon: 'قريباً',
        underConstruction: 'الصفحة قيد الإنشاء',
    },

    // ════════════════════════════════
    // ARABE TUNISIEN (RTL)
    // ════════════════════════════════
    'ar-tn': {
        appName: 'EVENT',
        tagline: 'منصتك متاعك للرياضة',
        chooseLanguage: 'اختار لغتك',
        username: 'اسمك ولا إيميلك',
        password: 'كلمة السر',
        login: 'ادخل',
        noAccount: 'ماعندكش حساب؟',
        register: 'سجل روحك',
        forgotPassword: 'نسيت كلمة السر؟',
        firstName: 'الاسم',
        lastName: 'الكنية',
        email: 'الإيميل',
        phone: 'تيليفون',
        birthDate: 'تاريخ الميلاد',
        role: 'الدور',
        roleSportif: 'رياضي',
        roleOrganisateur: 'منظم',
        roleSpectateur: 'متفرج',
        profilePhoto: 'صورة البروفيل',
        confirmPassword: 'أكد كلمة السر',
        createAccount: 'عمل حساب',
        alreadyAccount: 'عندك حساب؟',
        backToLogin: 'ارجع للدخول',
        resetPassword: 'بدل كلمة السر',
        resetInstruction: 'حط إيميلك باش نبعثولك رابط.',
        sendResetLink: 'ابعث الرابط',
        emailSent: 'تم إرسال الإيميل!',
        emailSentDetail: 'شوف صندوق الوارد متاعك.',
        aboutOrg: 'اعرف أكثر على المنظمة',
        aboutApp: 'اكتشف التطبيق',
        ourLocation: 'وين احنا',
        aboutOrgTitle: 'على المنظمة',
        mission: 'مهمتنا',
        vision: 'رؤيتنا',
        team: 'فريقنا',
        partners: 'شركاؤنا',
        history: 'تاريخنا',
        aboutAppTitle: 'على التطبيق',
        features: 'الخصائص',
        howItWorks: 'كيفاش يخدم؟',
        version: 'الإصدار',
        downloadApp: 'حمل التطبيق',
        locationTitle: 'وين احنا',
        address: 'العنوان',
        openingHours: 'أوقات العمل',
        contact: 'تواصل معانا',
        getDirections: 'كيفاش توصل',
        callUs: 'اتصل بينا',
        emailUs: 'ابعثلنا إيميل',
        errorRequired: 'لازم تعمر كل الحقول.',
        errorEmail: 'الإيميل مش صحيح.',
        errorPasswordMatch: 'كلمات السر مش متشابهة.',
        errorPasswordLen: 'كلمة السر لازم تكون 6 أحرف على الأقل.',
        loading: 'يحمل...',
        sending: 'يبعث...',
        success: 'تم بنجاح!',
        error: 'صار مشكل.',
        comingSoon: 'قريباً',
        underConstruction: 'الصفحة في طور الإنجاز',
    },
};

// ── Créer le contexte ────────────────────────────────────────
const LanguageContext = createContext(null);

// ── Provider : enveloppe toute l'application ─────────────────
export const LanguageProvider = ({ children }) => {

    // Initialiser depuis localStorage (ou 'fr' par défaut)
    const [langue, setLangueState] = useState(() => {
        const saved = localStorage.getItem('event_langue');
        // Vérifier que la langue sauvegardée est valide
        return translations[saved] ? saved : 'fr';
    });

    // Langues qui s'écrivent de droite à gauche
    const languesRTL = ['ar', 'ar-tn'];
    const isRTL = languesRTL.includes(langue);

    // Appliquer la direction et la langue sur le document entier
    useEffect(() => {
        // Direction : RTL pour arabe, LTR pour les autres
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = langue;

        // Classe CSS sur body pour cibler avec CSS si nécessaire
        if (isRTL) {
            document.body.classList.add('rtl');
        } else {
            document.body.classList.remove('rtl');
        }
    }, [langue, isRTL]);

    // Changer la langue active
    const setLangue = (nouvelleLangue) => {
        if (!translations[nouvelleLangue]) {
            console.warn(`Langue inconnue : "${nouvelleLangue}". Retour au français.`);
            nouvelleLangue = 'fr';
        }
        localStorage.setItem('event_langue', nouvelleLangue);
        setLangueState(nouvelleLangue);
    };

    // Fonction de traduction
    // Retourne la clé elle-même si introuvable (aide au débogage)
    const t = (cle) => {
        const dict = translations[langue] || translations['fr'];
        return dict[cle] ?? translations['fr'][cle] ?? cle;
    };

    return (
        <LanguageContext.Provider value={{ langue, setLangue, t, isRTL }}>
            {children}
        </LanguageContext.Provider>
    );
};

// Hook personnalisé — à utiliser dans tous les composants
export const useLanguage = () => {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLanguage doit être dans un <LanguageProvider>');
    return ctx;
};

export default LanguageContext;