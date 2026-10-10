# Le panneau d’assistant IA

Chaque éditeur peut faire appel au panneau IA : sélectionnez quelque chose, donnez une instruction, puis suivez le résultat au fil de sa génération.

## L’ouvrir et s’en servir

![Le panneau IA dans Docs](img/ai-panel.png)

- Points d’accès : le **bouton IA** du ruban de chaque éditeur, **Demander à l’IA** dans les menus contextuels, ou Demander à l’IA sur la barre de marquage.
- Décrivez la tâche en langage courant (reformuler ceci / transformer cette colonne en pourcentages / remettre cette page en forme…) et appuyez sur Entrée.
- Les réponses s’affichent **au fil de l’eau** ; lorsque l’IA a besoin d’outils (lire le document, le modifier), elle les exécute et continue jusqu’au bout.
- **Arrêter** : interrompez le tour en cours à tout moment.

## Ce qu’il sait faire

- **Docs** : reformuler, développer, traduire, résumer, insérer des tableaux et des images, ajuster la mise en forme ; chaque tour enregistre d’abord un instantané.
- **Sheets** : formules, remplissage de données, transformations en lot, mise en forme.
- **Slides** : génération d’une présentation complète, ajustement de la mise en page, réécriture des textes.
- **PDF** : questions et résumés portant sur le texte ou les pages sélectionnés.
- **Markdown / HTML** : reformuler, développer, traduire.

## Historique des conversations

- Chaque conversation est enregistrée automatiquement et reste sur cette machine : rouvrez le panneau demain et reprenez là où vous en étiez.
- Démarrez un nouveau chat avec **Nouveau chat** ; pour passer d’une conversation passée à une autre, utilisez la liste de l’historique en haut du panneau.
- Renommez un chat pour le retrouver plus vite ; supprimez-le pour l’effacer définitivement. Supprimer un chat ne touche jamais à vos documents.

## Retour arrière et sécurité

- Le panneau de Docs conserve une **liste de versions** : un instantané par tour. Vous pouvez revenir à n’importe lequel, et ce retour arrière peut lui-même être annulé avec Ctrl+Z. Les instantanés restent disponibles lorsque vous rouvrez le document.
- Les modifications de l’IA passent par le même circuit d’édition que les modifications manuelles (annulables, soumises à l’enregistrement) : rien ne contourne votre confirmation d’enregistrement.

## Confidentialité et anonymisation

- Les instructions et le contenu pertinent du document sont envoyés au **service de modèle que vous avez configuré** (VEGA hébergé ou point de terminaison personnalisé, chapitre suivant) ; sans configuration, rien n’est envoyé.
- **Anonymisation (152-FZ)** : avant l’envoi, l’application peut masquer les données personnelles — noms, numéros de téléphone, e-mails, données de passeport — afin que le modèle ne les voie jamais. Activez-la dans Paramètres ▸ IA ; les passages masqués sont automatiquement rétablis dans votre document.
- **Aucune analyse de suivi** : OfficeVega est livré sans Google Analytics ni aucun autre traceur tiers. Il n’existe pas d’interrupteur de statistiques d’utilisation, car il n’y a rien à désactiver : les documents et le contenu des chats ne quittent jamais le chemin que vous avez configuré.
- Les fichiers locaux ne sont envoyés nulle part ailleurs ; les clés BYOK sont stockées dans le fichier de paramètres de l’application sur cette machine et envoyées uniquement dans les en-têtes des requêtes.
