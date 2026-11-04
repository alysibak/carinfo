/** Accounts: sign-in, sign-up, password reset, the account page and recall alerts. English text to French (fr-CA). */
const fr: Record<string, string> = {
  // RequireAccount gate and App.tsx gives
  'your garage': 'votre garage',
  'the Value chart': 'le graphique des valeurs',
  'Checking your sign-in': 'Vérification de votre connexion',
  'Free with an account': 'Gratuit avec un compte',
  'Sign in to use {tool}': 'Connectez-vous pour utiliser {tool}',
  '{tool} is free with a CarInfo account.': '{tool} est gratuit avec un compte CarInfo.',
  '{tool} is free with a CarInfo account. Car pages, search and browsing stay open to everyone.':
    '{tool} est gratuit avec un compte CarInfo. Les pages de véhicules, la recherche et la navigation restent ouvertes à tous.',
  'Create free account': 'Créer un compte gratuit',
  'Sign in': 'Se connecter',
  '{count} car saved on this device will move into your garage when you sign in.':
    '{count} véhicule enregistré sur cet appareil sera versé dans votre garage lorsque vous vous connecterez.',
  '{count} cars saved on this device will move into your garage when you sign in.':
    '{count} véhicules enregistrés sur cet appareil seront versés dans votre garage lorsque vous vous connecterez.',
  'Save cars from any page, and find them on any device you sign in on.':
    'Enregistrez des véhicules depuis n’importe quelle page, et retrouvez-les sur tout appareil où vous vous connectez.',
  'See how your shortlist differs, and which saved cars have recalls in Canada.':
    'Voyez en quoi votre liste diffère, et quels véhicules enregistrés font l’objet d’un rappel au Canada.',
  'Compare saved cars side by side, or share the list with a link.':
    'Comparez vos véhicules enregistrés côte à côte, ou partagez la liste avec un lien.',
  'Every car’s estimated value against its fuel use, on one chart.':
    'La valeur estimée de chaque véhicule face à sa consommation, sur un seul graphique.',
  'Pick a square to see the cars in it, and open any of them.':
    'Choisissez une case pour voir les véhicules qu’elle contient, et ouvrez n’importe lequel.',

  // AuthForm
  or: 'ou',
  'Opening {name}…': 'Ouverture de {name}…',
  'Continue with {name}': 'Continuer avec {name}',
  'Last used': 'Dernière utilisation',
  "Accounts aren't available": 'Les comptes ne sont pas disponibles',
  "Sign-in isn't set up on this site right now. Every page and tool is open to you meanwhile.":
    'La connexion n’est pas configurée sur ce site pour le moment. Toutes les pages et tous les outils restent ouverts entre-temps.',
  'Set <0>DATABASE_URL</0> and <1>BETTER_AUTH_SECRET</1> on the server to turn them on.':
    'Définissez <0>DATABASE_URL</0> et <1>BETTER_AUTH_SECRET</1> sur le serveur pour les activer.',
  'Search cars': 'Rechercher des véhicules',

  // EmailCodeForm and shared field labels
  Email: 'Courriel',
  Password: 'Mot de passe',
  Code: 'Code',
  'Email me a code': 'M’envoyer un code par courriel',
  'Sending…': 'Envoi…',
  'Signing in…': 'Connexion…',
  'Send a new code': 'Envoyer un nouveau code',
  'Use a different email': 'Utiliser un autre courriel',
  'Use a password instead': 'Utiliser un mot de passe plutôt',
  'We emailed a {count}-digit code to {email}. It works for 10 minutes.':
    'Nous avons envoyé un code à {count} chiffres à {email}. Il est valide pendant 10 minutes.',
  "We'll email you a code to sign in with. New here? This makes your account.":
    'Nous vous enverrons un code par courriel pour vous connecter. Nouveau ici\u00a0? Cela crée votre compte.',
  'Signed in, but this browser did not keep the sign-in. Allow cookies for this site.':
    'Connexion réussie, mais ce navigateur n’a pas conservé la session. Autorisez les témoins pour ce site.',

  // Sign in / sign up
  'Sign in to CarInfo.': 'Connectez-vous à CarInfo.',
  'Your garage and the Value chart are free with an account.':
    'Votre garage et le graphique des valeurs sont gratuits avec un compte.',
  'New to CarInfo? <0>Create a free account</0>':
    'Nouveau sur CarInfo\u00a0? <0>Créer un compte gratuit</0>',
  'Forgot your password?': 'Mot de passe oublié\u00a0?',
  'No password? Email me a code': 'Pas de mot de passe\u00a0? M’envoyer un code par courriel',
  'Create an account': 'Créer un compte',
  'Create a free CarInfo account.': 'Créer un compte CarInfo gratuit.',
  'Create a free account': 'Créer un compte gratuit',
  'Create account': 'Créer un compte',
  'Creating account…': 'Création du compte…',
  'For your garage and the Value chart. Search, car pages, Compare and the VIN lookup stay open to everyone.':
    'Pour votre garage et le graphique des valeurs. La recherche, les pages de véhicules, Comparer et la recherche par NIV restent ouvertes à tous.',
  'Already have an account? <0>Sign in</0>': 'Vous avez déjà un compte\u00a0? <0>Se connecter</0>',
  'Name (optional)': 'Nom (facultatif)',
  'At least 8 characters.': 'Au moins 8 caractères.',
  "We'll email you a link to confirm the address.":
    'Nous vous enverrons un lien pour confirmer l’adresse.',
  'Rather not make a password? Email me a code':
    'Vous préférez ne pas créer de mot de passe\u00a0? M’envoyer un code par courriel',
  'Make a password instead': 'Créer un mot de passe plutôt',
  'Account made, but this browser did not keep the sign-in. Allow cookies for this site.':
    'Compte créé, mais ce navigateur n’a pas conservé la session. Autorisez les témoins pour ce site.',
  'Creating an account accepts the <0>terms of use</0>; the <1>privacy policy</1> says what is kept and why.':
    'Créer un compte vaut acceptation des <0>conditions d’utilisation</0>\u00a0; la <1>politique de confidentialité</1> indique ce qui est conservé et pourquoi.',

  // Forgot / reset password
  'Reset your password': 'Réinitialiser votre mot de passe',
  'Reset your CarInfo password.': 'Réinitialisez votre mot de passe CarInfo.',
  'Back to sign in': 'Retour à la connexion',
  "Password reset by email isn't available on this site yet.":
    'La réinitialisation du mot de passe par courriel n’est pas encore offerte sur ce site.',
  "Password reset by email isn't available on this site yet. If you signed up with {providers}, sign in with it instead.":
    'La réinitialisation du mot de passe par courriel n’est pas encore offerte sur ce site. Si vous vous êtes inscrit avec {providers}, connectez-vous plutôt avec ce compte.',
  "Enter the email you signed up with. We'll send a link to choose a new password.":
    'Entrez le courriel avec lequel vous vous êtes inscrit. Nous enverrons un lien pour choisir un nouveau mot de passe.',
  'Or skip the password: <0>sign in with a code by email</0>':
    'Ou sautez le mot de passe\u00a0: <0>connectez-vous avec un code par courriel</0>',
  'If an account uses {email}, a reset link is on its way. It works for one hour.':
    'Si un compte utilise {email}, un lien de réinitialisation est en route. Il est valide pendant une heure.',
  'Send reset link': 'Envoyer le lien de réinitialisation',
  'Choose a new password': 'Choisir un nouveau mot de passe',
  'Choose a new CarInfo password.': 'Choisissez un nouveau mot de passe CarInfo.',
  'This link has expired': 'Ce lien a expiré',
  'Send a new link': 'Envoyer un nouveau lien',
  'Reset links work once, for one hour. Ask for a new one.':
    'Les liens de réinitialisation fonctionnent une seule fois, pendant une heure. Demandez-en un nouveau.',
  'Password changed': 'Mot de passe modifié',
  'Your new password is set, and other devices have been signed out.':
    'Votre nouveau mot de passe est enregistré, et les autres appareils ont été déconnectés.',
  'The two passwords are not the same.': 'Les deux mots de passe ne sont pas identiques.',
  'New password': 'Nouveau mot de passe',
  'New password, again': 'Nouveau mot de passe, une seconde fois',
  'Set new password': 'Enregistrer le nouveau mot de passe',
  'Saving…': 'Enregistrement…',

  // Account page
  Account: 'Compte',
  'Your CarInfo account, garage and plan.': 'Votre compte CarInfo, garage et forfait.',
  'Loading account': 'Chargement du compte',
  'Signed in as <0>{email}</0>': 'Connecté en tant que <0>{email}</0>',
  'Checkout complete. If Pro is not showing yet, refresh in a few seconds while Stripe confirms.':
    'Paiement terminé. Si Pro n’apparaît pas encore, actualisez dans quelques secondes le temps que Stripe confirme.',
  'Checkout canceled. Nothing was charged.': 'Paiement annulé. Aucun montant n’a été facturé.',
  'Recall alerts': 'Alertes de rappel',
  'An email when Transport Canada lists a new recall for a car in your garage. Recalls already listed are on the garage page.':
    'Un courriel lorsque Transports Canada inscrit un nouveau rappel pour un véhicule de votre garage. Les rappels déjà inscrits figurent sur la page du garage.',
  'Email me about new recalls': 'M’écrire au sujet des nouveaux rappels',
  'Confirm your email address first: alerts go only to a confirmed one.':
    'Confirmez d’abord votre adresse courriel\u00a0: les alertes ne partent qu’à une adresse confirmée.',
  'Could not change recall alerts. Try again.':
    'Impossible de modifier les alertes de rappel. Réessayez.',
  'Your data': 'Vos données',
  'Everything CarInfo keeps about your account, in one file: your profile, sign-ins, garage and recall alerts. The <0>privacy policy</0> says why each is kept.':
    'Tout ce que CarInfo conserve sur votre compte, dans un seul fichier\u00a0: votre profil, vos connexions, votre garage et vos alertes de rappel. La <0>politique de confidentialité</0> explique pourquoi chacun est conservé.',
  'Download my data': 'Télécharger mes données',
  'Confirm your email': 'Confirmez votre courriel',
  'We sent a link to {email}. Confirming it lets you reset a forgotten password, and brings over a garage or plan from an account you made here before.':
    'Nous avons envoyé un lien à {email}. Le confirmer vous permet de réinitialiser un mot de passe oublié, et de récupérer un garage ou un forfait d’un compte que vous aviez créé ici auparavant.',
  'Sent. Check your inbox.': 'Envoyé. Vérifiez votre boîte de réception.',
  'Send the link again': 'Renvoyer le lien',
  'Your garage': 'Votre garage',
  '{count} saved · no limit': '{count} enregistrés · sans limite',
  '{count} saved · up to {limit}': '{count} enregistrés · jusqu’à {limit}',
  'Saved to your account, on every device you sign in on.':
    'Enregistré dans votre compte, sur chaque appareil où vous vous connectez.',
  'On this device only until it syncs.': 'Sur cet appareil seulement jusqu’à la synchronisation.',
  'Open garage': 'Ouvrir le garage',
  'Sync now': 'Synchroniser maintenant',
  Plan: 'Forfait',
  Pro: 'Pro',
  Free: 'Gratuit',
  'Free: every tool, and a garage of up to {limit} cars':
    'Gratuit\u00a0: tous les outils, et un garage d’au plus {limit} véhicules',
  'Pro: a garage with no limit': 'Pro\u00a0: un garage sans limite',
  'Billing did not answer. Try again.': 'La facturation n’a pas répondu. Réessayez.',
  'Could not start checkout. Try again.': 'Impossible de démarrer le paiement. Réessayez.',
  'Could not open billing.': 'Impossible d’ouvrir la facturation.',
  'Redirecting…': 'Redirection…',
  'Upgrade to Pro': 'Passer à Pro',
  'Opening…': 'Ouverture…',
  'Manage billing': 'Gérer la facturation',
  'Sign-in': 'Connexion',
  'This account has no password: you sign in with {method}.':
    'Ce compte n’a pas de mot de passe\u00a0: vous vous connectez avec {method}.',
  'a code by email': 'un code par courriel',
  '{list} or {last}': '{list} ou {last}',
  'Current password': 'Mot de passe actuel',
  'At least 8 characters. Other devices are signed out.':
    'Au moins 8 caractères. Les autres appareils sont déconnectés.',
  'Change password': 'Changer le mot de passe',
  'Password changed. Other devices have been signed out.':
    'Mot de passe modifié. Les autres appareils ont été déconnectés.',
  'Signed out everywhere but here.': 'Déconnecté partout sauf ici.',
  'Sign out': 'Se déconnecter',
  'Sign out of other devices': 'Se déconnecter des autres appareils',
  'Signing out…': 'Déconnexion…',
  'Delete account': 'Supprimer le compte',
  'Delete my account…': 'Supprimer mon compte…',
  'This deletes your sign-in and your saved garage for good.':
    'Cela supprime définitivement votre connexion et votre garage enregistré.',
  "To confirm it's you, sign in again, then come back here to delete the account.":
    'Pour confirmer qu’il s’agit bien de vous, reconnectez-vous, puis revenez ici pour supprimer le compte.',
  'Sign in again': 'Se reconnecter',
  'Your password, to confirm': 'Votre mot de passe, pour confirmer',
  'Delete my account': 'Supprimer mon compte',
  'Deleting…': 'Suppression…',
  'Keep it': 'Le conserver',

  // Unsubscribe
  'Turn off CarInfo recall alerts.': 'Désactiver les alertes de rappel CarInfo.',
  'Recall alerts are off. No more will be sent.':
    'Les alertes de rappel sont désactivées. Aucune autre ne sera envoyée.',
  'You can turn them back on from your <0>account</0>.':
    'Vous pouvez les réactiver depuis votre <0>compte</0>.',
  'This link is missing its code. Use the link in the email, or turn alerts off from your <0>account</0>.':
    'Ce lien n’a pas son code. Utilisez le lien du courriel, ou désactivez les alertes depuis votre <0>compte</0>.',
  'Stop the emails about new recalls for the cars in your garage?':
    'Arrêter les courriels sur les nouveaux rappels pour les véhicules de votre garage\u00a0?',
  'Turning off…': 'Désactivation…',
  'Turn recall alerts off': 'Désactiver les alertes de rappel',
  'This link is not valid. Turn alerts off from your account instead.':
    'Ce lien n’est pas valide. Désactivez plutôt les alertes depuis votre compte.',
  'Could not turn alerts off. Try again.': 'Impossible de désactiver les alertes. Réessayez.',
};

export default fr;
