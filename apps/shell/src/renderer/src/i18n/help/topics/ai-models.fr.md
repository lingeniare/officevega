# Modèles IA et paramètres

## Fournisseurs et modèles

Les modèles et les clés se configurent dans les Paramètres (la ligne de compte en bas à gauche de l’accueil) :

![La fenêtre des paramètres](img/settings-general.png)

- **VEGA sur ses serveurs** : connectez-vous (flux par code d’appareil) et utilisez-le — aucune configuration. Les requêtes partent vers `https://api.vega.chat`, un point de terminaison compatible OpenRouter : tout client de style OpenRouter peut donc s’y connecter.
- **Points de terminaison personnalisés (BYOK)** : Paramètres ▸ IA demande une URL de base et une clé API par protocole — compatible OpenAI, Anthropic, Gemini, DeepSeek, DashScope (qwen) et d’autres. Les clés sont stockées dans le fichier de paramètres de l’application sur cette machine et envoyées uniquement dans les en-têtes des requêtes.
- Un modèle différent peut être choisi par capacité : chat/génération, génération d’images, analyse d’images.
- **Tester la connexion** : vérifie que le point de terminaison est joignable et que le modèle est visible avant d’enregistrer.
- Les URL de base peuvent comporter un chemin et une chaîne de requête (style passerelle) ; les chemins des points de terminaison sont ajoutés correctement.

## Choisir un modèle

- Le sélecteur de modèle se trouve en haut du panneau IA et dans Paramètres ▸ Modèle IA : un choix pour le chat, et des choix séparés pour la génération et l’analyse d’images lorsque le fournisseur les prend en charge.
- Commencez avec le modèle VEGA par défaut : il convient à la plupart des tâches de bureautique (reformulation, tableaux, formules, résumés). Passez à un modèle plus grand pour les raisonnements complexes ou les longs documents, et à un modèle plus petit et économique pour les brouillons rapides.
- Une conversation en cours conserve l’ancien modèle jusqu’à son tour suivant ; les nouveaux chats utilisent immédiatement le nouveau choix.

## Tarifs et utilisation

- La facturation VEGA se fait à l’usage, modèle par modèle. La grille tarifaire complète se trouve sur [api.vega.chat/aimodels](https://api.vega.chat/aimodels) : vérifiez le prix en entrée et en sortie d’un modèle avant un gros traitement.
- Le solde et les dépenses actuels sont disponibles sur le [tableau de bord VEGA](https://api.vega.chat/dashboard), également accessible depuis la ligne de solde du menu du compte.
- Sans connexion, seules les options gratuites intégrées fonctionnent ; connectez-vous pour débloquer tous les modèles de la grille tarifaire.

## Intégration CLI (classe Codex)

- Les paramètres acceptent le chemin d’un programme CLI local (les répertoires personnels non ASCII et un préfixe ~ fonctionnent ; ~ est développé automatiquement) ; Détecter les modèles interroge les modèles disponibles de la CLI.
- La validation vérifie seulement que le chemin existe — aucune restriction de jeu de caractères.

## Quand les changements s’appliquent

- Les changements de modèle et de point de terminaison s’appliquent immédiatement ; une conversation en cours conserve l’ancienne configuration jusqu’à son tour suivant.
