# Paramètres, langue, thème et intégrations MCP

## Ouvrir les paramètres

La ligne de compte en bas à gauche de l’accueil ouvre le panneau des paramètres (elle affiche Se connecter lorsque vous êtes déconnecté). Il comporte six sections : Compte, Modèle IA, Médias IA et recherche, Général, Intégrations et À propos.

![Paramètres ▸ Général, où se trouvent la langue, le thème et l’enregistrement automatique](img/settings-general.png)

La configuration des modèles a son propre article ; dans **Médias IA et recherche**, vous activez, par fournisseur, la génération d’images, l’analyse d’images, l’analyse vidéo, la recherche web et la recherche de fichiers locaux.

## Langue

- Les paramètres proposent **21 langues d’interface** : anglais, chinois simplifié, japonais, coréen, français, allemand, espagnol, thaï, indonésien, russe, arabe, portugais, italien, polonais, tchèque, néerlandais, malais, hébreu, hindi, chinois traditionnel, vietnamien.
- Le changement s’applique immédiatement et est conservé ; la barre de menus native est reconstruite dans la langue choisie.

## Thème

Clair / Sombre / Suivre le système. « Suivre le système » reprend l’apparence de l’OS, et les éditeurs changent d’apparence en même temps, sans clignotement. Le même réglage recolore aussi le panneau IA et l’accueil, pour que toute l’application reste dans un seul style : Clair pour les pièces lumineuses, Sombre pour le travail de nuit, Suivre le système pour suivre Windows.

## Général

- **Aucune analyse de suivi** : OfficeVega est livré sans Google Analytics ni aucun autre traceur tiers — le contenu des documents, les noms de fichiers et les événements d’utilisation ne sont jamais collectés ni envoyés nulle part.
- **Position de la barre latérale IA** (à gauche ou à droite), **Taille du texte du panneau IA** et **Correction orthographique dans le chat IA**.
- **Ouvrir le panneau IA dans les nouveaux documents** — désactivé : un nouveau document démarre avec le panneau replié, à un clic de là.
- **Enregistrer automatiquement tous les documents** active l’enregistrement automatique par défaut dans tous les éditeurs ; vous pouvez toujours le désactiver pour une fenêtre donnée.
- **Emplacement d’enregistrement** avec un bouton **Modifier**, et **Application par défaut pour les documents Office** pour attribuer .docx / .xlsx / .pptx à OfficeVega.

## Médias IA et recherche

Ce ne sont pas des interrupteurs : chaque capacité choisit le fournisseur qui la sert, et la clé et l’URL de base d’un fournisseur sont saisies une seule fois puis partagées :

- **Recherche web**, **Génération d’images**, **Analyse d’images** et **Analyse vidéo**, chacune avec un fournisseur, un modèle, une clé et une URL de base. Choisissez **VEGA** comme fournisseur pour les faire passer par `api.vega.chat` avec votre clé de connexion.
- La **recherche de fichiers locale** tourne sur cette machine. En dessous, le **reranking de recherche Jev** est **désactivé par défaut**. Activez-le et les extraits des 20 premiers résultats locaux — jusqu'à 1 200 caractères par document, plus noms de fichiers et de dossiers — partent vers le point de terminaison de décision choisi (VEGA, Jev via OpenRouter ou TypeSafe, Perplexity, Liquid AI d1, Cloudflare, un moteur local ou une URL personnalisée) pour être réordonnés par pertinence. Désactivé, rien ne quitte l'appareil.

## À propos

- **Version**, le site du projet [officevega.com](https://officevega.com) et la page des versions [officevega.com/releases](https://officevega.com/releases).
- **Canal de mise à jour** : Stable ou Bêta. Un changement prend effet immédiatement et lance une recherche de mise à jour ; il ne rétrograde pas une installation Bêta vers Stable.

## Associations d’applications par défaut

Les paramètres peuvent enregistrer OfficeVega comme gestionnaire de .docx / .xlsx / .pptx / .pdf et de formats similaires (enregistrement d’application par défaut au niveau de la plateforme ; confirmez lorsque l’on vous le demande).

## Mentions relatives aux logiciels tiers et mises à jour

- Aide ▸ Mentions relatives aux logiciels tiers : l’inventaire complet des licences open source livré avec l’application.
- Aide ▸ Vérifier les mises à jour : lance une vérification manuelle ; si une version plus récente existe, l’installation vous est proposée.

## Connexion à VEGA

- Le point d’entrée de connexion (dans les paramètres ou dans la liste des projets cloud) utilise un flux par **code d’appareil** : OfficeVega affiche un code et ouvre la connexion dans le navigateur ; la suite se fait automatiquement une fois terminée.
- La connexion sert uniquement à la liste des projets cloud et aux modèles hébergés par VEGA sur `api.vega.chat`. Sans elle, toutes les fonctions locales et les modèles personnalisés continuent de fonctionner.
- La déconnexion se fait en un clic dans les paramètres.

## Support

Questions, idées et rapports de bogues : [officevega.com/feedback](https://officevega.com/feedback), chaîne Telegram [t.me/getmyai](https://t.me/getmyai), e-mail [mail@vega.chat](mailto:mail@vega.chat). Développeur : [getmyai.io](https://getmyai.io) (Dmitry Filippov).

## Intégration MCP (pour les utilisateurs avancés / clients IA)

**Intégrations** est le panneau qui relie OfficeVega à un agent de codage, et il a son propre article : Connecter un agent de codage. La version courte : choisissez une voie (la ligne de commande ou MCP), suivez la section correspondante, puis ouvrez un nouveau chat et posez votre question.

![Paramètres ▸ Intégrations : les trois étapes, puis les lignes de compétences et les options MCP](img/settings-integrations.png)

Sous **Serveur HTTP local**, l’application peut aussi lancer le serveur elle-même (un interrupteur d’activation et un port). **Avancé** ajoute l’URL de contrôle de santé et le fichier journal. Le serveur n’écoute que sur localhost.

## Aide-mémoire de la ligne de commande

| Commande            | Ce qu’elle fait                 |
| ------------------- | ------------------------------- |
| `officevega <file>` | ouvrir un fichier               |
| `officevega mcp`    | démarrer le serveur MCP local   |
| `officevega --help` | toutes les commandes et options |
