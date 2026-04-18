// ============================================================
// translations.js — Toutes les traductions de l'application
// 4 langues : fr (Français), en (English), ar (عربى), ar-tn (تونسي)
// ============================================================

const translations = {

    // ── FRANÇAIS ──
    fr: {
        // Splash
        appName: 'EVENT',
        tagline: 'Votre plateforme sportive',

        // Sélection de langue
        chooseLanguage: 'Choisissez votre langue',
        languageFr: 'Français',
        languageEn: 'English',
        languageAr: 'عربى',
        languageArTn: '🇹🇳 عربى تونسي',

        // Login
        username: 'Nom d\'utilisateur ou Email',
        password: 'Mot de passe',
        login: 'Entrer',
        register: 'S\'inscrire',
        forgotPassword: 'Mot de passe oublié ?',
        noAccount: 'Pas encore de compte ?',

        // Navigation bas de page
        aboutOrg: 'Découvrir l\'organisme',
        aboutApp: 'Découvrir l\'application',
        ourLocation: 'Notre localisation',

        // Erreurs / Messages
        errorRequired: 'Tous les champs sont obligatoires',
        errorLogin: 'Email ou mot de passe incorrect',
        loading: 'Chargement...',
        success: 'Connexion réussie !',

        // Register (TODO)
        firstName: 'Prénom',
        lastName: 'Nom',
        email: 'Email',
        phone: 'Téléphone',
        confirmPassword: 'Confirmer le mot de passe',
        createAccount: 'Créer mon compte',
        alreadyAccount: 'Déjà un compte ?',

        // Forgot Password (TODO)
        resetPassword: 'Réinitialiser le mot de passe',
        sendResetLink: 'Envoyer le lien',
        backToLogin: 'Retour à la connexion',
    },

    // ── ENGLISH ──
    en: {
        appName: 'EVENT',
        tagline: 'Your sports platform',
        chooseLanguage: 'Choose your language',
        languageFr: 'Français',
        languageEn: 'English',
        languageAr: 'عربى',
        languageArTn: '🇹🇳 Tunisian Arabic',
        username: 'Username or Email',
        password: 'Password',
        login: 'Enter',
        register: 'Sign Up',
        forgotPassword: 'Forgot password?',
        noAccount: 'No account yet?',
        aboutOrg: 'About Us',
        aboutApp: 'About the App',
        ourLocation: 'Our Location',
        errorRequired: 'All fields are required',
        errorLogin: 'Invalid email or password',
        loading: 'Loading...',
        success: 'Login successful!',
        firstName: 'First Name',
        lastName: 'Last Name',
        email: 'Email',
        phone: 'Phone',
        confirmPassword: 'Confirm Password',
        createAccount: 'Create Account',
        alreadyAccount: 'Already have an account?',
        resetPassword: 'Reset Password',
        sendResetLink: 'Send Reset Link',
        backToLogin: 'Back to Login',
    },

    // ── ARABE STANDARD ── (direction RTL)
    ar: {
        appName: 'EVENT',
        tagline: 'منصتك الرياضية',
        chooseLanguage: 'اختر لغتك',
        languageFr: 'Français',
        languageEn: 'English',
        languageAr: 'عربى',
        languageArTn: '🇹🇳 عربى تونسي',
        username: 'اسم المستخدم أو البريد الإلكتروني',
        password: 'كلمة المرور',
        login: 'دخول',
        register: 'التسجيل',
        forgotPassword: 'نسيت كلمة السر؟',
        noAccount: 'ليس لديك حساب؟',
        aboutOrg: 'تعرف على المنظمة',
        aboutApp: 'اكتشف التطبيق',
        ourLocation: 'موقعنا',
        errorRequired: 'جميع الحقول مطلوبة',
        errorLogin: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        loading: 'جاري التحميل...',
        success: 'تم تسجيل الدخول بنجاح!',
        firstName: 'الاسم الأول',
        lastName: 'اسم العائلة',
        email: 'البريد الإلكتروني',
        phone: 'الهاتف',
        confirmPassword: 'تأكيد كلمة المرور',
        createAccount: 'إنشاء حساب',
        alreadyAccount: 'لديك حساب بالفعل؟',
        resetPassword: 'إعادة تعيين كلمة المرور',
        sendResetLink: 'إرسال الرابط',
        backToLogin: 'العودة إلى تسجيل الدخول',
    },

    // ── ARABE TUNISIEN ── (direction RTL)
    'ar-tn': {
        appName: 'EVENT',
        tagline: 'منصتك متاعك للرياضة',
        chooseLanguage: 'اختار لغتك',
        languageFr: 'Français',
        languageEn: 'English',
        languageAr: 'عربى',
        languageArTn: '🇹🇳 عربى تونسي',
        username: 'اسمك ولا ايميلك',
        password: 'كلمة السر',
        login: 'ادخل',
        register: 'سجل روحك',
        forgotPassword: 'نسيت كلمة السر؟',
        noAccount: 'ماعندكش حساب؟',
        aboutOrg: 'اعرف أكثر على المنظمة',
        aboutApp: 'اكتشف التطبيق',
        ourLocation: 'وين احنا',
        errorRequired: 'لازم تعمر كل الحقول',
        errorLogin: 'الايميل ولا كلمة السر غالط',
        loading: 'يحمل...',
        success: 'دخلت بنجاح!',
        firstName: 'الاسم',
        lastName: 'الكنية',
        email: 'الايميل',
        phone: 'تيليفون',
        confirmPassword: 'أكد كلمة السر',
        createAccount: 'عمل حساب',
        alreadyAccount: 'عندك حساب؟',
        resetPassword: 'بدل كلمة السر',
        sendResetLink: 'ابعث الرابط',
        backToLogin: 'ارجع للدخول',
    }
};

export default translations;