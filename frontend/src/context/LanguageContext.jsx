// ============================================================
// LanguageContext.jsx
// Emplacement : frontend/src/context/LanguageContext.jsx
//
// PROBLÈMES CORRIGÉS :
//   1. Les autres langues ne s'activaient pas → le Provider
//      n'était pas enveloppé autour de toute l'app dans App.jsx
//   2. La direction RTL n'était pas appliquée immédiatement
//   3. La langue sauvegardée en localStorage n'était pas rechargée
//
// COMMENT UTILISER DANS N'IMPORTE QUEL COMPOSANT :
//   import { useLanguage } from '../context/LanguageContext';
//   const { t, langue, setLangue, isRTL } = useLanguage();
//   <h1>{t('login')}</h1>
//
// POUR AJOUTER UNE TRADUCTION :
//   Ajouter la clé dans chacun des 4 objets (fr, en, ar, ar-tn)
//
// POUR AJOUTER UNE LANGUE :
//   1. Ajouter l'objet de traduction ici
//   2. Ajouter le code dans languesRTL si c'est RTL
//   3. Ajouter dans le composant LanguageSwitcher
// ============================================================

import React, { createContext, useContext, useState, useEffect } from 'react';

// ── Toutes les traductions de l'application ──────────────────
const translations = {

  // ══════════════════════════════════════
  // FRANÇAIS — langue par défaut
  // ══════════════════════════════════════
  fr: {
    // Général
    appName: 'EVENT',
    tagline: 'Votre plateforme sportive',
    loading: 'Chargement...',
    sending: 'Envoi en cours...',
    success: 'Succès !',
    error: 'Une erreur est survenue.',
    comingSoon: 'Bientôt disponible',
    underConstruction: 'Page en construction',
    optional: 'optionnel',
    required: 'obligatoire',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    close: 'Fermer',
    confirm: 'Confirmer',
    search: 'Rechercher...',
    noResult: 'Aucun résultat',

    // Sélection de langue
    chooseLanguage: 'Choisissez votre langue',

    // Login
    username: "Email ou identifiant",
    password: 'Mot de passe',
    login: 'Se connecter',
    loginTitle: 'Connexion',
    noAccount: "Pas encore de compte ?",
    register: "S'inscrire",
    forgotPassword: 'Mot de passe oublié ?',
    errorLogin: 'Email ou mot de passe incorrect',

    // Register
    createAccount: 'Créer mon compte',
    firstName: 'Prénom',
    lastName: 'Nom de famille',
    email: 'Adresse email',
    phone: 'Numéro de téléphone',
    birthDate: 'Date de naissance',
    sexe: 'Sexe',
    sexeHomme: 'Homme',
    sexeFemme: 'Femme',
    sexeAutre: 'Autre',
    role: 'Rôle',
    roleSportif: 'Sportif',
    roleOrganisateur: 'Organisateur',
    roleSpectateur: 'Spectateur',
    profilePhoto: 'Photo de profil',
    confirmPassword: 'Confirmer le mot de passe',
    alreadyAccount: 'Déjà un compte ?',

    // Forgot password
    resetPassword: 'Réinitialiser le mot de passe',
    resetInstruction: 'Entrez votre email pour recevoir un lien de réinitialisation.',
    sendResetLink: 'Envoyer le lien',
    emailSent: 'Email envoyé !',
    emailSentDetail: 'Vérifiez votre boîte mail et cliquez sur le lien reçu.',
    checkSpam: "Vérifiez vos spams si vous ne recevez pas l'email.",
    linkExpires: 'Le lien expire dans 1 heure.',
    backToLogin: 'Retour à la connexion',

    // Navigation bas de page login
    aboutOrg: "Découvrir l'organisme",
    aboutApp: "Découvrir l'application",
    ourLocation: 'Notre localisation',

    // Dashboard commun
    dashboard: 'Mon espace',
    adminPanel: 'Administration',
    logout: 'Déconnexion',
    hello: 'Bonjour',
    activitySummary: 'Voici un résumé de votre activité sportive.',

    // Stats dashboard
    totalPoints: 'Points cumulés',
    sportHours: 'Heures de sport',
    reliability: 'Fiabilité',
    availableCoupons: 'Coupons disponibles',
    myCreatedEvents: 'Mes événements créés',
    progressToNext: 'Progression vers le niveau suivant',
    participateForPoints: 'Participez à des événements pour gagner des points et débloquer des coupons !',

    // Onglets dashboard user
    myRegistrations: 'Mes inscriptions',
    explore: 'Explorer',
    myCreations: 'Mes créations',
    rewards: 'Récompenses',

    // Événements
    proposeEvent: 'Proposer un événement',
    createEvent: 'Créer un événement',
    eventTitle: "Titre de l'événement",
    eventDescription: 'Description',
    startDate: 'Date et heure de début',
    endDate: 'Date et heure de fin',
    maxParticipants: 'Participants max',
    location: 'Lieu',
    sportCategory: 'Type de sport',
    selectLocation: '— Sélectionner un lieu —',
    selectCategory: '— Sélectionner —',
    submit: "Soumettre l'événement",
    submitInfo: "Votre événement sera soumis en brouillon. L'administrateur le validera avant publication.",
    noEvents: 'Aucun événement disponible.',
    noRegistrations: "Vous n'êtes inscrit à aucun événement.",
    noCreations: "Vous n'avez encore proposé aucun événement.",
    noRewards: 'Participez à des événements pour gagner des coupons !',
    exploreEmpty: 'Aucun événement disponible. Proposez le premier !',
    register_event: "S'inscrire",
    viewQR: 'Mon QR code',
    howItWorks_create: 'Comment ça marche ?',
    howItWorks_detail: "Vos événements soumis partent en brouillon et doivent être validés par l'administrateur. Une fois publié, les participants pourront s'inscrire.",
    deleteEvent: 'Supprimer',
    confirmDelete: 'Supprimer cet événement ?',

    // Statuts événements
    statusPublished: 'Publié',
    statusDraft: 'En attente de validation',
    statusCancelled: 'Annulé',
    statusFinished: 'Terminé',

    // Admin
    globalView: 'Vue globale',
    users: 'Utilisateurs',
    events: 'Événements',
    totalUsers: 'Utilisateurs inscrits',
    publishedEvents: 'Événements publiés',
    totalParticipations: 'Total participations',
    avgReliability: 'Fiabilité moyenne',
    pendingValidation: 'En attente de validation',
    pendingAlert: "Des utilisateurs ont soumis des événements qui nécessitent votre approbation.",
    validateNow: 'Valider maintenant →',
    publish: 'Publier',
    refuse: 'Refuser',
    cancel_event: 'Annuler',
    submittedBy: 'Soumis par',
    creator: 'Créateur',
    allStatuses: 'Tous',
    filterBy: 'Filtrer :',
    noEventsTable: 'Aucun événement.',
    searchUsers: 'Rechercher un utilisateur...',
    userSpace: 'Espace utilisateur',
    recentEvents: 'Derniers événements',
    manage: 'Gérer →',
    initialStatus: 'Statut initial',
    publishDirectly: 'Publier directement',

    // Niveaux
    levelChampion: 'Champion',
    levelAdvanced: 'Avancé',
    levelActive: 'Actif',
    levelBeginner: 'Débutant',

    // Erreurs formulaire
    errorRequired: 'Tous les champs obligatoires doivent être remplis.',
    errorEmail: "Format d'email invalide.",
    errorPasswordMatch: 'Les mots de passe ne correspondent pas.',
    errorPasswordLen: 'Le mot de passe doit contenir au moins 6 caractères.',
    errorPhotoType: 'Veuillez sélectionner une image (JPG, PNG...).',
    errorPhotoSize: 'La photo ne doit pas dépasser 5 Mo.',

    // Pages info
    aboutOrgTitle: "À propos de l'organisme",
    aboutAppTitle: "À propos de l'application",
    locationTitle: 'Notre localisation',
    presentation: 'Présentation',
    mission: 'Notre mission',
    vision: 'Notre vision',
    team: 'Notre équipe',
    partners: 'Nos partenaires',
    history: 'Notre histoire',
    features: 'Fonctionnalités',
    howItWorks: 'Comment ça marche ?',
    version: 'Version',
    downloadApp: "Télécharger l'app",
    changelog: 'Historique des versions',
    address: 'Adresse',
    openingHours: "Horaires d'ouverture",
    contact: 'Contact',
    getDirections: 'Itinéraire',
    callUs: 'Appeler',
    emailUs: 'Écrire',
    copy: 'Copier',
    copySuccess: 'Copié !',
    socialMedia: 'Réseaux sociaux',
    viewOnMap: 'Voir sur la carte',
    closed: 'Fermé',
  },

  // ══════════════════════════════════════
  // ENGLISH
  // ══════════════════════════════════════
  en: {
    appName: 'EVENT',
    tagline: 'Your sports platform',
    loading: 'Loading...',
    sending: 'Sending...',
    success: 'Success!',
    error: 'An error occurred.',
    comingSoon: 'Coming soon',
    underConstruction: 'Page under construction',
    optional: 'optional',
    required: 'required',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    confirm: 'Confirm',
    search: 'Search...',
    noResult: 'No results',
    chooseLanguage: 'Choose your language',
    username: 'Email or username',
    password: 'Password',
    login: 'Sign in',
    loginTitle: 'Sign in',
    noAccount: 'No account yet?',
    register: 'Sign up',
    forgotPassword: 'Forgot password?',
    errorLogin: 'Incorrect email or password',
    createAccount: 'Create account',
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email address',
    phone: 'Phone number',
    birthDate: 'Date of birth',
    sexe: 'Gender',
    sexeHomme: 'Male',
    sexeFemme: 'Female',
    sexeAutre: 'Other',
    role: 'Role',
    roleSportif: 'Athlete',
    roleOrganisateur: 'Organizer',
    roleSpectateur: 'Spectator',
    profilePhoto: 'Profile photo',
    confirmPassword: 'Confirm password',
    alreadyAccount: 'Already have an account?',
    resetPassword: 'Reset password',
    resetInstruction: 'Enter your email to receive a reset link.',
    sendResetLink: 'Send reset link',
    emailSent: 'Email sent!',
    emailSentDetail: 'Check your inbox and click the link.',
    checkSpam: "Check your spam folder if you don't receive the email.",
    linkExpires: 'The link expires in 1 hour.',
    backToLogin: 'Back to login',
    aboutOrg: 'About us',
    aboutApp: 'About the app',
    ourLocation: 'Our location',
    dashboard: 'My space',
    adminPanel: 'Administration',
    logout: 'Sign out',
    hello: 'Hello',
    activitySummary: 'Here is a summary of your sports activity.',
    totalPoints: 'Cumulated points',
    sportHours: 'Sport hours',
    reliability: 'Reliability',
    availableCoupons: 'Available coupons',
    myCreatedEvents: 'My created events',
    progressToNext: 'Progress to next level',
    participateForPoints: 'Participate in events to earn points and unlock coupons!',
    myRegistrations: 'My registrations',
    explore: 'Explore',
    myCreations: 'My creations',
    rewards: 'Rewards',
    proposeEvent: 'Propose an event',
    createEvent: 'Create an event',
    eventTitle: 'Event title',
    eventDescription: 'Description',
    startDate: 'Start date and time',
    endDate: 'End date and time',
    maxParticipants: 'Max participants',
    location: 'Location',
    sportCategory: 'Sport type',
    selectLocation: '— Select a location —',
    selectCategory: '— Select —',
    submit: 'Submit event',
    submitInfo: 'Your event will be submitted as a draft. The administrator will validate it before publication.',
    noEvents: 'No events available.',
    noRegistrations: 'You are not registered in any event.',
    noCreations: 'You have not proposed any event yet.',
    noRewards: 'Participate in events to earn coupons!',
    exploreEmpty: 'No events available. Propose the first one!',
    register_event: 'Register',
    viewQR: 'My QR code',
    howItWorks_create: 'How does it work?',
    howItWorks_detail: 'Submitted events go to draft status and must be validated by the administrator. Once published, participants can register.',
    deleteEvent: 'Delete',
    confirmDelete: 'Delete this event?',
    statusPublished: 'Published',
    statusDraft: 'Pending validation',
    statusCancelled: 'Cancelled',
    statusFinished: 'Finished',
    globalView: 'Overview',
    users: 'Users',
    events: 'Events',
    totalUsers: 'Registered users',
    publishedEvents: 'Published events',
    totalParticipations: 'Total participations',
    avgReliability: 'Average reliability',
    pendingValidation: 'Pending validation',
    pendingAlert: 'Users have submitted events that require your approval.',
    validateNow: 'Validate now →',
    publish: 'Publish',
    refuse: 'Refuse',
    cancel_event: 'Cancel',
    submittedBy: 'Submitted by',
    creator: 'Creator',
    allStatuses: 'All',
    filterBy: 'Filter:',
    noEventsTable: 'No events.',
    searchUsers: 'Search a user...',
    userSpace: 'User space',
    recentEvents: 'Recent events',
    manage: 'Manage →',
    initialStatus: 'Initial status',
    publishDirectly: 'Publish directly',
    levelChampion: 'Champion',
    levelAdvanced: 'Advanced',
    levelActive: 'Active',
    levelBeginner: 'Beginner',
    errorRequired: 'All required fields must be filled.',
    errorEmail: 'Invalid email format.',
    errorPasswordMatch: 'Passwords do not match.',
    errorPasswordLen: 'Password must be at least 6 characters.',
    errorPhotoType: 'Please select an image (JPG, PNG...).',
    errorPhotoSize: 'Photo must not exceed 5 MB.',
    aboutOrgTitle: 'About the organization',
    aboutAppTitle: 'About the app',
    locationTitle: 'Our location',
    presentation: 'Overview',
    mission: 'Our mission',
    vision: 'Our vision',
    team: 'Our team',
    partners: 'Our partners',
    history: 'Our history',
    features: 'Features',
    howItWorks: 'How it works',
    version: 'Version',
    downloadApp: 'Download the app',
    changelog: 'Version history',
    address: 'Address',
    openingHours: 'Opening hours',
    contact: 'Contact',
    getDirections: 'Get directions',
    callUs: 'Call',
    emailUs: 'Email',
    copy: 'Copy',
    copySuccess: 'Copied!',
    socialMedia: 'Social media',
    viewOnMap: 'View on map',
    closed: 'Closed',
  },

  // ══════════════════════════════════════
  // ARABE STANDARD — RTL
  // ══════════════════════════════════════
  ar: {
    appName: 'EVENT',
    tagline: 'منصتك الرياضية',
    loading: 'جاري التحميل...',
    sending: 'جاري الإرسال...',
    success: 'تم بنجاح!',
    error: 'حدث خطأ ما.',
    comingSoon: 'قريباً',
    underConstruction: 'الصفحة قيد الإنشاء',
    optional: 'اختياري',
    required: 'إلزامي',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    close: 'إغلاق',
    confirm: 'تأكيد',
    search: 'بحث...',
    noResult: 'لا توجد نتائج',
    chooseLanguage: 'اختر لغتك',
    username: 'البريد الإلكتروني أو اسم المستخدم',
    password: 'كلمة المرور',
    login: 'دخول',
    loginTitle: 'تسجيل الدخول',
    noAccount: 'ليس لديك حساب؟',
    register: 'التسجيل',
    forgotPassword: 'نسيت كلمة السر؟',
    errorLogin: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    createAccount: 'إنشاء حساب',
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    email: 'البريد الإلكتروني',
    phone: 'رقم الهاتف',
    birthDate: 'تاريخ الميلاد',
    sexe: 'الجنس',
    sexeHomme: 'ذكر',
    sexeFemme: 'أنثى',
    sexeAutre: 'آخر',
    role: 'الدور',
    roleSportif: 'رياضي',
    roleOrganisateur: 'منظم',
    roleSpectateur: 'متفرج',
    profilePhoto: 'صورة الملف الشخصي',
    confirmPassword: 'تأكيد كلمة المرور',
    alreadyAccount: 'لديك حساب بالفعل؟',
    resetPassword: 'إعادة تعيين كلمة المرور',
    resetInstruction: 'أدخل بريدك الإلكتروني لتلقي رابط إعادة التعيين.',
    sendResetLink: 'إرسال الرابط',
    emailSent: 'تم إرسال البريد الإلكتروني!',
    emailSentDetail: 'تحقق من صندوق الوارد واضغط على الرابط.',
    checkSpam: 'تحقق من مجلد الرسائل غير المرغوب فيها.',
    linkExpires: 'ينتهي الرابط خلال ساعة واحدة.',
    backToLogin: 'العودة إلى تسجيل الدخول',
    aboutOrg: 'تعرف على المنظمة',
    aboutApp: 'اكتشف التطبيق',
    ourLocation: 'موقعنا',
    dashboard: 'فضائي',
    adminPanel: 'لوحة الإدارة',
    logout: 'تسجيل الخروج',
    hello: 'مرحباً',
    activitySummary: 'إليك ملخص نشاطك الرياضي.',
    totalPoints: 'النقاط المتراكمة',
    sportHours: 'ساعات الرياضة',
    reliability: 'الموثوقية',
    availableCoupons: 'القسائم المتاحة',
    myCreatedEvents: 'فعالياتي المنشأة',
    progressToNext: 'التقدم نحو المستوى التالي',
    participateForPoints: 'شارك في الفعاليات لكسب النقاط وفتح القسائم!',
    myRegistrations: 'تسجيلاتي',
    explore: 'استكشف',
    myCreations: 'إنشاءاتي',
    rewards: 'المكافآت',
    proposeEvent: 'اقتراح فعالية',
    createEvent: 'إنشاء فعالية',
    eventTitle: 'عنوان الفعالية',
    eventDescription: 'الوصف',
    startDate: 'تاريخ ووقت البداية',
    endDate: 'تاريخ ووقت النهاية',
    maxParticipants: 'الحد الأقصى للمشاركين',
    location: 'الموقع',
    sportCategory: 'نوع الرياضة',
    selectLocation: '— اختر موقعاً —',
    selectCategory: '— اختر —',
    submit: 'إرسال الفعالية',
    submitInfo: 'سيتم إرسال فعاليتك كمسودة. سيقوم المسؤول بالتحقق منها قبل النشر.',
    noEvents: 'لا توجد فعاليات متاحة.',
    noRegistrations: 'لم تسجل في أي فعالية.',
    noCreations: 'لم تقترح أي فعالية حتى الآن.',
    noRewards: 'شارك في الفعاليات لكسب القسائم!',
    exploreEmpty: 'لا توجد فعاليات متاحة. اقترح الأولى!',
    register_event: 'التسجيل',
    viewQR: 'رمز QR الخاص بي',
    howItWorks_create: 'كيف يعمل؟',
    howItWorks_detail: 'تذهب فعالياتك المقترحة إلى المسودة ويجب التحقق منها من قبل المسؤول. بعد النشر يمكن للمشاركين التسجيل.',
    deleteEvent: 'حذف',
    confirmDelete: 'حذف هذه الفعالية؟',
    statusPublished: 'منشور',
    statusDraft: 'في انتظار التحقق',
    statusCancelled: 'ملغى',
    statusFinished: 'منتهي',
    globalView: 'نظرة عامة',
    users: 'المستخدمون',
    events: 'الفعاليات',
    totalUsers: 'المستخدمون المسجلون',
    publishedEvents: 'الفعاليات المنشورة',
    totalParticipations: 'إجمالي المشاركات',
    avgReliability: 'متوسط الموثوقية',
    pendingValidation: 'في انتظار التحقق',
    pendingAlert: 'أرسل المستخدمون فعاليات تحتاج إلى موافقتك.',
    validateNow: 'تحقق الآن ←',
    publish: 'نشر',
    refuse: 'رفض',
    cancel_event: 'إلغاء',
    submittedBy: 'مقدم من',
    creator: 'المنشئ',
    allStatuses: 'الكل',
    filterBy: 'تصفية:',
    noEventsTable: 'لا توجد فعاليات.',
    searchUsers: 'البحث عن مستخدم...',
    userSpace: 'فضاء المستخدم',
    recentEvents: 'آخر الفعاليات',
    manage: 'إدارة ←',
    initialStatus: 'الحالة الأولية',
    publishDirectly: 'نشر مباشرة',
    levelChampion: 'بطل',
    levelAdvanced: 'متقدم',
    levelActive: 'نشيط',
    levelBeginner: 'مبتدئ',
    errorRequired: 'يجب ملء جميع الحقول الإلزامية.',
    errorEmail: 'تنسيق البريد الإلكتروني غير صالح.',
    errorPasswordMatch: 'كلمات المرور غير متطابقة.',
    errorPasswordLen: 'يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل.',
    errorPhotoType: 'يرجى اختيار صورة (JPG أو PNG...).',
    errorPhotoSize: 'يجب ألا يتجاوز حجم الصورة 5 ميغابايت.',
    aboutOrgTitle: 'حول المنظمة',
    aboutAppTitle: 'حول التطبيق',
    locationTitle: 'موقعنا',
    presentation: 'نظرة عامة',
    mission: 'مهمتنا',
    vision: 'رؤيتنا',
    team: 'فريقنا',
    partners: 'شركاؤنا',
    history: 'تاريخنا',
    features: 'الميزات',
    howItWorks: 'كيف يعمل؟',
    version: 'الإصدار',
    downloadApp: 'تحميل التطبيق',
    changelog: 'سجل الإصدارات',
    address: 'العنوان',
    openingHours: 'ساعات العمل',
    contact: 'التواصل',
    getDirections: 'الحصول على الاتجاهات',
    callUs: 'اتصل',
    emailUs: 'راسل',
    copy: 'نسخ',
    copySuccess: 'تم النسخ!',
    socialMedia: 'وسائل التواصل الاجتماعي',
    viewOnMap: 'عرض على الخريطة',
    closed: 'مغلق',
  },

  // ══════════════════════════════════════
  // ARABE TUNISIEN — RTL
  // ══════════════════════════════════════
  'ar-tn': {
    appName: 'EVENT',
    tagline: 'منصتك متاعك للرياضة',
    loading: 'يحمل...',
    sending: 'يبعث...',
    success: 'تم بنجاح!',
    error: 'صار مشكل.',
    comingSoon: 'قريباً',
    underConstruction: 'الصفحة في طور الإنجاز',
    optional: 'اختياري',
    required: 'لازم',
    save: 'سجل',
    cancel: 'ألغي',
    delete: 'احذف',
    edit: 'عدل',
    close: 'اسكر',
    confirm: 'أكد',
    search: 'فتش...',
    noResult: 'ما لقيناش',
    chooseLanguage: 'اختار لغتك',
    username: 'الإيميل ولا اسمك',
    password: 'كلمة السر',
    login: 'ادخل',
    loginTitle: 'الدخول',
    noAccount: 'ماعندكش حساب؟',
    register: 'سجل روحك',
    forgotPassword: 'نسيت كلمة السر؟',
    errorLogin: 'الإيميل ولا كلمة السر مش صح',
    createAccount: 'عمل حساب',
    firstName: 'الاسم',
    lastName: 'الكنية',
    email: 'الإيميل',
    phone: 'تيليفون',
    birthDate: 'تاريخ الميلاد',
    sexe: 'الجنس',
    sexeHomme: 'ذكر',
    sexeFemme: 'أنثى',
    sexeAutre: 'آخر',
    role: 'الدور',
    roleSportif: 'رياضي',
    roleOrganisateur: 'منظم',
    roleSpectateur: 'متفرج',
    profilePhoto: 'صورة البروفيل',
    confirmPassword: 'أكد كلمة السر',
    alreadyAccount: 'عندك حساب؟',
    resetPassword: 'بدل كلمة السر',
    resetInstruction: 'حط إيميلك باش نبعثولك رابط.',
    sendResetLink: 'ابعث الرابط',
    emailSent: 'تم إرسال الإيميل!',
    emailSentDetail: 'شوف صندوق الوارد واضغط على الرابط.',
    checkSpam: 'شوف في الرسائل المزعجة كان ما لقيتوش.',
    linkExpires: 'الرابط يبطل من بعد ساعة.',
    backToLogin: 'ارجع للدخول',
    aboutOrg: 'اعرف أكثر على المنظمة',
    aboutApp: 'اكتشف التطبيق',
    ourLocation: 'وين احنا',
    dashboard: 'فضائي',
    adminPanel: 'لوحة الإدارة',
    logout: 'اخرج',
    hello: 'أهلاً',
    activitySummary: 'هاك ملخص نشاطك الرياضي.',
    totalPoints: 'النقاط متاعك',
    sportHours: 'ساعات الرياضة',
    reliability: 'الموثوقية',
    availableCoupons: 'القسائم المتاحة',
    myCreatedEvents: 'الفعاليات اللي عملتهم',
    progressToNext: 'التقدم للمستوى الجاي',
    participateForPoints: 'شارك في الفعاليات باش تكسب نقاط وتفتح قسائم!',
    myRegistrations: 'تسجيلاتي',
    explore: 'استكشف',
    myCreations: 'اللي عملت',
    rewards: 'المكافآت',
    proposeEvent: 'اقترح فعالية',
    createEvent: 'اعمل فعالية',
    eventTitle: 'عنوان الفعالية',
    eventDescription: 'الوصف',
    startDate: 'تاريخ ووقت البداية',
    endDate: 'تاريخ ووقت النهاية',
    maxParticipants: 'أقصى عدد مشاركين',
    location: 'الموقع',
    sportCategory: 'نوع الرياضة',
    selectLocation: '— اختار موقع —',
    selectCategory: '— اختار —',
    submit: 'ابعث الفعالية',
    submitInfo: 'الفعالية متاعك تمشي مسودة. المسؤول يلازم يصادق عليها قبل النشر.',
    noEvents: 'ما فماش فعاليات.',
    noRegistrations: 'ما سجلتش في فعالية.',
    noCreations: 'ما اقترحتش فعالية حتى.',
    noRewards: 'شارك في الفعاليات باش تكسب قسائم!',
    exploreEmpty: 'ما فماش فعاليات. اقترح الأولى!',
    register_event: 'سجل',
    viewQR: 'رمز QR متاعي',
    howItWorks_create: 'كيفاش يخدم؟',
    howItWorks_detail: 'الفعاليات اللي تبعثهم تمشي مسودة ولازم المسؤول يصادق عليهم. بعد النشر يقدرو الناس يسجلو.',
    deleteEvent: 'احذف',
    confirmDelete: 'تحذف هذه الفعالية؟',
    statusPublished: 'منشور',
    statusDraft: 'في انتظار التحقق',
    statusCancelled: 'ملغى',
    statusFinished: 'منتهي',
    globalView: 'نظرة عامة',
    users: 'المستخدمين',
    events: 'الفعاليات',
    totalUsers: 'المستخدمين المسجلين',
    publishedEvents: 'الفعاليات المنشورة',
    totalParticipations: 'جملة المشاركات',
    avgReliability: 'متوسط الموثوقية',
    pendingValidation: 'في انتظار التحقق',
    pendingAlert: 'ناس بعثو فعاليات تحتاج مصادقتك.',
    validateNow: 'صادق الساعة ←',
    publish: 'انشر',
    refuse: 'ارفض',
    cancel_event: 'ألغي',
    submittedBy: 'قدمها',
    creator: 'اللي عمله',
    allStatuses: 'الكل',
    filterBy: 'فلتر:',
    noEventsTable: 'ما فماش فعاليات.',
    searchUsers: 'فتش على مستخدم...',
    userSpace: 'فضاء المستخدم',
    recentEvents: 'آخر الفعاليات',
    manage: 'إدارة ←',
    initialStatus: 'الحالة الأولية',
    publishDirectly: 'انشر مباشرة',
    levelChampion: 'بطل',
    levelAdvanced: 'متقدم',
    levelActive: 'نشيط',
    levelBeginner: 'مبتدئ',
    errorRequired: 'لازم تعمر كل الحقول.',
    errorEmail: 'الإيميل مش صحيح.',
    errorPasswordMatch: 'كلمات السر مش متشابهة.',
    errorPasswordLen: 'كلمة السر لازم تكون 6 أحرف على الأقل.',
    errorPhotoType: 'اختار صورة (JPG ولا PNG...).',
    errorPhotoSize: 'الصورة ما تعداش 5 ميغا.',
    aboutOrgTitle: 'على المنظمة',
    aboutAppTitle: 'على التطبيق',
    locationTitle: 'وين احنا',
    presentation: 'نظرة عامة',
    mission: 'مهمتنا',
    vision: 'رؤيتنا',
    team: 'الفريق متاعنا',
    partners: 'شركاؤنا',
    history: 'تاريخنا',
    features: 'الخصائص',
    howItWorks: 'كيفاش يخدم؟',
    version: 'الإصدار',
    downloadApp: 'حمل التطبيق',
    changelog: 'التحديثات',
    address: 'العنوان',
    openingHours: 'أوقات العمل',
    contact: 'تواصل معانا',
    getDirections: 'كيفاش توصل',
    callUs: 'اتصل',
    emailUs: 'ابعث إيميل',
    copy: 'نسخ',
    copySuccess: 'تم النسخ!',
    socialMedia: 'مواقع التواصل',
    viewOnMap: 'شوف في الخريطة',
    closed: 'مسكر',
  },
};

// ── Créer le contexte ────────────────────────────────────────
const LanguageContext = createContext(null);

// ─────────────────────────────────────────────────────────────
// LanguageProvider
//
// COMMENT L'ACTIVER (cause du bug "autres langues ne s'activent pas"):
//   Ce Provider DOIT envelopper TOUTE l'application dans App.jsx
//   Si App.jsx ne l'inclut pas → useLanguage() retourne null → crash
//
//   Dans App.jsx :
//   import { LanguageProvider } from './context/LanguageContext';
//
//   function App() {
//     return (
//       <LanguageProvider>          ← DOIT être ici, AVANT Router
//         <BrowserRouter>
//           <Routes>...</Routes>
//         </BrowserRouter>
//       </LanguageProvider>
//     );
//   }
// ─────────────────────────────────────────────────────────────
export const LanguageProvider = ({ children }) => {

  // Lire la langue sauvegardée, ou 'en' par défaut
  const [langue, setLangueState] = useState(() => {
    const saved = localStorage.getItem('event_langue');
    // Vérifier que la langue sauvegardée existe vraiment dans translations
    return translations[saved] ? saved : 'en';
  });

  // Langues qui s'écrivent de droite à gauche
  // POUR AJOUTER UNE LANGUE RTL : ajouter son code ici
  const languesRTL = ['ar', 'ar-tn'];
  const isRTL = languesRTL.includes(langue);

  // Appliquer la direction et la langue sur le document HTML
  // Se déclenche à chaque changement de langue
  useEffect(() => {
    // dir="rtl" ou dir="ltr" sur la balise <html>
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = langue;

    // Classe CSS sur <body> pour cibler avec des règles CSS
    // Ex dans CSS : body.rtl .mon-element { text-align: right; }
    if (isRTL) {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
  }, [langue, isRTL]);

  // Changer la langue depuis n'importe quel composant
  const setLangue = (nouvelleLangue) => {
    // Vérifier que la langue existe
    if (!translations[nouvelleLangue]) {
      console.warn(`[LanguageContext] Langue inconnue : "${nouvelleLangue}"`);
      return;
    }
    // Sauvegarder dans localStorage pour persister entre sessions
    localStorage.setItem('event_langue', nouvelleLangue);
    setLangueState(nouvelleLangue);
  };

  // Fonction de traduction
  // Si la clé n'existe pas dans la langue active → chercher en anglais → retourner la clé brute
  const t = (cle) => {
    const dict = translations[langue] || translations['en'];
    return dict[cle] ?? translations['en']?.[cle] ?? cle;
  };

  return (
    <LanguageContext.Provider value={{ langue, setLangue, t, isRTL, translations }}>
      {children}
    </LanguageContext.Provider>
  );
};

// ── Hook useLanguage ─────────────────────────────────────────
// Utiliser dans tous les composants pour accéder aux traductions
export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Si ce message apparaît : LanguageProvider manque dans App.jsx
    throw new Error(
      '[useLanguage] Utilisé en dehors de <LanguageProvider>.\n' +
      'Vérifier que App.jsx enveloppe tout avec <LanguageProvider>.'
    );
  }
  return ctx;
};

export default LanguageContext;
